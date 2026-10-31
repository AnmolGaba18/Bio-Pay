
import torch
import numpy as np

from PIL import Image, ImageOps
from facenet_pytorch import MTCNN, InceptionResnetV1


class FaceEngine:

    def __init__(self):

        # Select available device
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        print(f"Loading FaceNet on: {self.device}")

        # Initialize MTCNN for face detection
        self.face_detector = MTCNN(
            image_size=160,
            margin=20,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            post_process=True,
            device=self.device,
            keep_all=True
        )

        # Load pretrained FaceNet model
        self.face_recognizer = InceptionResnetV1(
            pretrained="vggface2"
        ).eval().to(self.device)

        print("FaceNet model loaded successfully!")

    def generate_embedding(self, image: Image.Image):

        if not isinstance(image, Image.Image):
            raise ValueError("Input must be a PIL image")

        # Correct image orientation and convert to RGB
        image = ImageOps.exif_transpose(image).convert("RGB")

        # Detect faces
        faces = self.face_detector(image)

        if faces is None:
            raise ValueError("No face detected in the image")

        # Handle MTCNN output dimensions
        if faces.ndim == 4:

            if faces.shape[0] != 1:
                raise ValueError(
                    "Multiple faces detected. Use an image with one face"
                )

            # Extract the single detected face
            face = faces[0]

        elif faces.ndim == 3:

            # Single face without batch dimension
            face = faces

        else:
            raise ValueError("Unexpected face tensor dimensions")

        # Add batch dimension exactly once
        face = face.unsqueeze(0).to(self.device)

        if face.ndim != 4:
            raise ValueError("Invalid face tensor dimensions")

        # Generate face embedding
        with torch.inference_mode():
            embedding = self.face_recognizer(face)

        # Convert embedding to normalized NumPy vector
        embedding = embedding.squeeze(0).cpu().numpy()

        embedding = embedding / (
            np.linalg.norm(embedding) + 1e-10
        )

        return embedding.astype(np.float32)

    def compare_embeddings(self, embedding1, embedding2):

        embedding1 = np.asarray(embedding1, dtype=np.float32)
        embedding2 = np.asarray(embedding2, dtype=np.float32)

        if embedding1.shape != (512,) or embedding2.shape != (512,):
            raise ValueError("Both embeddings must contain 512 values")

        if not np.all(np.isfinite(embedding1)) or not np.all(np.isfinite(embedding2)):
            raise ValueError("Embeddings contain invalid values")

        if np.linalg.norm(embedding1) < 1e-8 or np.linalg.norm(embedding2) < 1e-8:
            raise ValueError("Invalid zero-vector embedding")

        # Cosine similarity
        similarity = np.dot(embedding1, embedding2) / (
            np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        )

        return float(similarity)


# Initialize the engine
face_engine = FaceEngine()
