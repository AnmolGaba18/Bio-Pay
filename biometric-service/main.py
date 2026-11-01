
from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError
from io import BytesIO
from starlette.concurrency import run_in_threadpool

import numpy as np

from face_engine import face_engine


# Configuration
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 25_000_000
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG"}


app = FastAPI(
    title="BioPay Biometric Service",
    description="Face enrollment and verification service",
    version="1.1.0"
)


@app.get("/")
async def root():
    return {
        "success": True,
        "message": "BioPay Biometric Service is running"
    }


@app.get("/health")
async def health_check():
    return {
        "success": True,
        "service": "BioPay Biometric Service",
        "status": "healthy"
    }


# IMAGE VALIDATION
async def process_image(file: UploadFile):

    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are supported"
        )

    try:
        # Read at most 5 MB + 1 byte
        image_bytes = await file.read(MAX_IMAGE_SIZE + 1)

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded image is empty"
            )

        if len(image_bytes) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Image size must not exceed 5 MB"
            )

        # Validate actual image content, not just MIME type
        image = Image.open(BytesIO(image_bytes))

        if image.format not in ALLOWED_IMAGE_FORMATS:
            raise HTTPException(
                status_code=400,
                detail="Invalid image format"
            )

        width, height = image.size

        if width <= 0 or height <= 0:
            raise HTTPException(
                status_code=400,
                detail="Invalid image dimensions"
            )

        if width * height > MAX_IMAGE_PIXELS:
            raise HTTPException(
                status_code=413,
                detail="Image dimensions are too large"
            )

        # Decode image
        image.load()

        # Correct EXIF orientation and convert to RGB
        image = ImageOps.exif_transpose(image).convert("RGB")

        return image

    except HTTPException:
        raise

    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid or corrupted image file"
        )

    finally:
        await file.close()


# GENERATE FACE EMBEDDING
@app.post("/api/v1/biometric/enroll")
async def enroll_face(file: UploadFile = File(...)):

    image = await process_image(file)

    try:
        # Run CPU/GPU inference outside the event loop
        embedding = await run_in_threadpool(
            face_engine.generate_embedding,
            image
        )

        embedding = np.asarray(embedding, dtype=np.float32)

        if (
            embedding.shape != (512,) or
            not np.all(np.isfinite(embedding))
        ):
            raise ValueError("Invalid face embedding generated")

        return {
            "success": True,
            "message": "Face embedding generated successfully",
            "embedding_dimensions": int(len(embedding)),
            "embedding": embedding.tolist()
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        print("Face embedding error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to process face image"
        )


# VERIFY FACE EMBEDDING
@app.post("/api/v1/biometric/verify")
async def verify_face(
    file: UploadFile = File(...),
    registered_embedding: str = ""
):

    image = await process_image(file)

    try:
        if not registered_embedding.strip():
            raise ValueError("Registered embedding is required")

        # Parse registered embedding
        try:
            stored_values = [
                float(value.strip())
                for value in registered_embedding.split(",")
            ]
        except ValueError:
            raise ValueError("Registered embedding contains invalid values")

        stored_embedding = np.asarray(
            stored_values,
            dtype=np.float32
        )

        if (
            stored_embedding.shape != (512,) or
            not np.all(np.isfinite(stored_embedding))
        ):
            raise ValueError(
                "Registered embedding must contain 512 valid values"
            )

        if np.linalg.norm(stored_embedding) < 1e-8:
            raise ValueError("Registered embedding is invalid")

        # Generate new embedding
        live_embedding = await run_in_threadpool(
            face_engine.generate_embedding,
            image
        )

        # Compare embeddings
        similarity = face_engine.compare_embeddings(
            live_embedding,
            stored_embedding
        )

        if not np.isfinite(similarity):
            raise ValueError("Invalid similarity result")

        return {
            "success": True,
            "message": "Face comparison completed",
            "similarity": round(float(similarity), 4)
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:
        print("Face verification error:", str(error))

        raise HTTPException(
            status_code=500,
            detail="Unable to verify face image"
        )
