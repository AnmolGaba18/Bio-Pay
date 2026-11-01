
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

        # Initialize MTCNN face detector
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

        # Initialize pretrained FaceNet model
        self.face_recognizer = (
            InceptionResnetV1(pretrained="vggface2")
            .eval()
            .to(self.device)
        )

        print("FaceNet model loaded successfully!")

    # GENERATE FACE EMBEDDING
    def generate_embedding(self, image: Image.Image):

        if not isinstance(image, Image.Image):
            raise ValueError("Input must be a PIL image")

        # Correct image orientation and convert to RGB
        image = ImageOps.exif_transpose(image).convert("RGB")

        if image.width < 40 or image.height < 40:
            raise ValueError("Image dimensions are too small")

        # Detect and crop faces
        faces = self.face_detector(image)

        if faces is None:
            raise ValueError("No face detected in the image")

        if not isinstance(faces, torch.Tensor):
            raise ValueError("Unexpected MTCNN output")

        # Validate detected face dimensions
        if faces.ndim != 4:
            raise ValueError("Unexpected face tensor dimensions")

        if faces.shape[0] == 0:
            raise ValueError("No face detected in the image")

        if faces.shape[0] > 1:
            raise ValueError(
                "Multiple faces detected. Please use an image with one face"
            )

        if tuple(faces.shape[1:]) != (3, 160, 160):
            raise ValueError("Invalid detected face dimensions")

        # Move face tensor to selected device
        face = faces.to(
            device=self.device,
            dtype=torch.float32
        )

        if not torch.isfinite(face).all():
            raise ValueError("Invalid face image data")

        # Generate embedding
        with torch.inference_mode():

            embedding = self.face_recognizer(face)

        # Convert to NumPy
        embedding = embedding.squeeze(0).cpu().numpy()

        # Validate embedding
        if (
            embedding.shape != (512,) or
            not np.all(np.isfinite(embedding))
        ):
            raise ValueError("Invalid face embedding generated")

        # Normalize embedding
        magnitude = np.linalg.norm(embedding)

        if magnitude < 1e-8:
            raise ValueError("Unable to normalize face embedding")

        embedding = embedding / magnitude

        return embedding.astype(np.float32)

    # COMPARE TWO FACE EMBEDDINGS
    def compare_embeddings(self, embedding1, embedding2):

        embedding1 = np.asarray(
            embedding1,
            dtype=np.float32
        )

        embedding2 = np.asarray(
            embedding2,
            dtype=np.float32
        )

        # Validate dimensions
        if (
            embedding1.shape != (512,) or
            embedding2.shape != (512,)
        ):
            raise ValueError(
                "Both embeddings must contain exactly 512 values"
            )

        # Validate numerical values
        if (
            not np.all(np.isfinite(embedding1)) or
            not np.all(np.isfinite(embedding2))
        ):
            raise ValueError("Embeddings contain invalid values")

        magnitude1 = np.linalg.norm(embedding1)
        magnitude2 = np.linalg.norm(embedding2)

        if magnitude1 < 1e-8 or magnitude2 < 1e-8:
            raise ValueError("Invalid zero-vector embedding")

        # Calculate cosine similarity
        similarity = np.dot(
            embedding1,
            embedding2
        ) / (magnitude1 * magnitude2)

        if not np.isfinite(similarity):
            raise ValueError("Unable to calculate face similarity")

        return float(np.clip(similarity, -1.0, 1.0))


# Initialize FaceNet engine
face_engine = FaceEngine()
