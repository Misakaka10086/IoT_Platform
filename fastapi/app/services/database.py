import os
import psycopg2
from ..models.pusher import DatabaseDeviceStatusUpdate

class DatabaseService:
    def __init__(self):
        self.pool = psycopg2.pool.SimpleConnectionPool(1, 20,
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            host=os.environ.get("DB_HOST"),
            port=os.environ.get("DB_PORT"),
            database=os.environ.get("DB_NAME")
        )

    def update_device_status(self, update: DatabaseDeviceStatusUpdate):
        conn = self.pool.getconn()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE devices
                    SET online = %s, last_seen = %s
                    WHERE device_id = %s
                    """,
                    (update.status == 'online', update.last_seen, update.device_id)
                )
            conn.commit()
        finally:
            self.pool.putconn(conn)

database_service = DatabaseService()
