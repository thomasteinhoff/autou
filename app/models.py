from pydantic import BaseModel, Field

class EmailIn(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)

class EmailPendingOut(BaseModel):
    id: str
    status: str

class EmailDoneOut(EmailPendingOut):
    classification: str
    suggested_reply: str
