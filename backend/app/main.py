from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import plan, shopping, feedback, household

app = FastAPI(title="PlatePlan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(plan.router, prefix="/api/plan")
app.include_router(shopping.router, prefix="/api/shopping")
app.include_router(feedback.router, prefix="/api")
app.include_router(household.router, prefix="/api/households")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
