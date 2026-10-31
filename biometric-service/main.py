from fastapi import FastAPI, UploadFile, File, HTTPException
from PIL import Image, UnidentifiedImageError
from io import BytesIO
import numpy as np

from face_engine import face_engine

app = FastAPI(
    title="BioPay Biometric Service",
    description="Face enrollment and verification service",
    version="1.0.0"
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


async def process_image(file: UploadFile):
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG and PNG images are supported"
        )

    image_bytes = await file.read()

    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="Image size must not exceed 5 MB"
        )

    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
        return image

    except (UnidentifiedImageError, OSError):
        raise HTTPException(
            status_code=400,
            detail="Invalid image file"
        )


@app.post("/api/v1/biometric/enroll")
async def enroll_face(file: UploadFile = File(...)):

    image = await process_image(file)

    try:
        embedding = face_engine.generate_embedding(image)

        return {
            "success": True,
            "message": "Face embedding generated successfully",
            "embedding_dimensions": int(len(embedding)),
            "embedding": embedding.tolist()
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))


@app.post("/api/v1/biometric/verify")
async def verify_face(
    file: UploadFile = File(...),
    registered_embedding: str = ""
):

    image = await process_image(file)

    try:
        live_embedding = face_engine.generate_embedding(image)

        stored_values = [
            float(value.strip())
            for value in registered_embedding.split(",")
            if value.strip()
        ]

        stored_embedding = np.asarray(
            stored_values,
            dtype=np.float32
        )

        if stored_embedding.shape != (512,):
            raise ValueError("Registered embedding must contain 512 values")

        similarity = face_engine.compare_embeddings(
            live_embedding,
            stored_embedding
        )

        return {
            "success": True,
            "message": "Face comparison completed",
            "similarity": round(similarity, 4)
        }

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
