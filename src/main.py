from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
class SensorData(BaseModel):
    temperature: float
    humidity: float


@app.post("/api/sensor-data/")
async def receive_sensor_data(data: SensorData):
    print(f"Data received: {data}")
    return {"status": "success", "received_data": data.model_dump()}
