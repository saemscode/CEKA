import os
import io
import boto3
from botocore.exceptions import NoCredentialsError
import logging

class BackblazeVault:
    def __init__(self):
        self.endpoint = os.environ.get("B2_S3_ENDPOINT")
        self.key_id = os.environ.get("B2_KEY_ID")
        self.application_key = os.environ.get("B2_APPLICATION_KEY")
        self.bucket_name = os.environ.get("B2_BUCKET_NAME", "ceka-resources-vault")
        
        self.s3 = boto3.client(
            's3',
            endpoint_url=self.endpoint,
            aws_access_key_id=self.key_id,
            aws_secret_access_key=self.application_key
        )

    def upload_file(self, local_path, remote_path):
        try:
            self.s3.upload_file(local_path, self.bucket_name, remote_path)
            # Construct the public/signed URL
            # Note: For private buckets, signing would be needed. 
            # For CEKA Vault, we typically use public-read for resources.
            url = f"{self.endpoint}/{self.bucket_name}/{remote_path}"
            return url
        except Exception as e:
            logging.error(f"Backblaze upload failed: {e}")
            return None

    def upload_bytes(self, file_bytes, remote_path, content_type="application/pdf"):
        """Upload raw bytes directly to B2 without needing a local file."""
        try:
            self.s3.upload_fileobj(
                io.BytesIO(file_bytes),
                self.bucket_name,
                remote_path,
                ExtraArgs={"ContentType": content_type}
            )
            url = f"{self.endpoint}/{self.bucket_name}/{remote_path}"
            logging.info(f"B2 upload OK: {remote_path} ({len(file_bytes)} bytes)")
            return url
        except Exception as e:
            logging.error(f"Backblaze bytes upload failed: {e}")
            return None

    def file_exists(self, remote_path):
        """Check if a file already exists in B2."""
        try:
            self.s3.head_object(Bucket=self.bucket_name, Key=remote_path)
            return True
        except Exception:
            return False

    def get_signed_url(self, remote_path, expires_in=3600):
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': remote_path},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            logging.error(f"Failed to generate signed URL: {e}")
            return None

    def get_public_url(self, remote_path):
        """Return the direct public URL for a file in B2."""
        return f"{self.endpoint}/{self.bucket_name}/{remote_path}"
