from pydantic import BaseModel, Field, validator
from typing import Literal

OTAStatusValue = Literal["OTA Progress", "OTA Success", "OTA Error"]

class OTAPayloadBase(BaseModel):
    id: str
    status: OTAStatusValue
    progress: int

class OTAPayload(OTAPayloadBase):
    chip: str
    git_version: str
    config_version: str
    error_reason: str | None = None

    @validator('progress')
    def validate_progress(cls, v, values):
        status = values.get('status')
        if status == "OTA Progress" and not (0 <= v <= 100):
            raise ValueError('Progress must be between 0 and 100 for "OTA Progress" status')
        if (status == "OTA Success" or status == "OTA Error") and v != 100:
            raise ValueError('Progress must be 100 for "OTA Success" or "OTA Error" status')
        return v

class DeviceOTAStatus(BaseModel):
    device_id: str
    status: OTAStatusValue
    process: str

class OTAStatus(BaseModel):
    progressStatus: str | None = None
    result: Literal['success', 'error'] | None = None

class GitCommitInfo(BaseModel):
    version: str
    message: str
    authored_at: str
