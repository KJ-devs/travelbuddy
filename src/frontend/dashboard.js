const formatTimestamp = (ts) => {
  if (String(ts).length === 10) ts *= 1000;
  const date = new Date(ts);
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const fetchArduinoData = async () => {
  try {
    const response = await fetch("http://192.168.15.63:5000/arduino/getData");
    if (!response.ok) throw new Error("Erreur réseau : " + response.statusText);
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Erreur de récupération des données :", error);
    return [];
  }
};
const updateAirQualitySummary = (latest) => {
  const co2 = latest.sensors.co2?.value;
  const co = latest.sensors.co?.value;

  let summary = "Unknown";
  if (co2 < 700 && co < 3) summary = "Good 🌿";
  else if (co2 < 1000 && co < 5) summary = "Fair ⚠️";
  else summary = "Poor 🛑";

  document.getElementById("airQualitySummary").textContent = summary;
};

const updateHeaderValues = async () => {
  const data = await fetchArduinoData();
  if (!data.length) return;

  const latest = data[data.length - 1];

  updateAirQualitySummary(latest);

  document.getElementById("temperature").textContent =
    latest.sensors.temperature?.value?.toFixed(1) + "°C" || "N/A";

  document.getElementById("humidity").textContent =
    latest.sensors.humidity?.value?.toFixed(0) + "%" || "N/A";

  const motionDetected = latest.sensors.motion?.value;
  document.getElementById("motionStatus").innerHTML = motionDetected
    ? '<span class="text-green-500">Détecté</span>'
    : '<span class="text-red-500">Not detected</span>';
};
const generateEnvironmentAdvice = (latest) => {
  const co2 = latest.sensors.co2?.value;
  const humidity = latest.sensors.humidity?.value;
  const temperature = latest.sensors.temperature?.value;
  const co = latest.sensors.co?.value;
  const advice = [];

  if (co2 > 1000) {
    advice.push(
      "⚠️ High CO₂ levels detected. Please ventilate the room by opening windows or using an air purifier."
    );
  } else if (co2 > 700) {
    advice.push("⚠️ CO₂ is slightly elevated. Consider airing out the space.");
  }

  if (humidity > 70) {
    advice.push(
      "💧 High humidity may lead to mold. Use a dehumidifier or ventilate more frequently."
    );
  } else if (humidity < 30) {
    advice.push(
      "🏜️ Low humidity detected. You might want to use a humidifier to improve comfort."
    );
  }

  if (temperature > 27) {
    advice.push(
      "🔥 Temperature is high. Consider cooling options or improving airflow."
    );
  } else if (temperature < 18) {
    advice.push(
      "❄️ Temperature is low. Consider heating or insulating the room better."
    );
  }

  if (co > 2) {
    advice.push(
      "🚨 High CO levels detected! Please ensure proper ventilation and check for gas leaks immediately."
    );
  }

  const adviceList = document.getElementById("adviceList");
  adviceList.innerHTML = ""; // Clear previous

  if (advice.length === 0) {
    adviceList.innerHTML =
      "<li>✅ No advice needed. Your environment looks healthy! 🎉</li>";
  } else {
    advice.forEach((tip) => {
      const li = document.createElement("li");
      li.innerHTML = tip; // Using innerHTML to render emojis
      adviceList.appendChild(li);
    });
  }
};

const updateTemperatureChart = async () => {
  const data = await fetchArduinoData();
  if (!data.length) return;
  const temperatures = data.map(
    (entry) => entry.sensors.temperature?.value ?? null
  );
  const labels = data.map((entry) => formatTimestamp(entry.timestamp));
  tempChart.data.labels = labels;
  tempChart.data.datasets[0].data = temperatures;
  tempChart.update();
};

const updateHumidityChart = async () => {
  const data = await fetchArduinoData();
  if (!data.length) return;
  const humidity = data.map((entry) => entry.sensors.humidity?.value ?? null);
  const labels = data.map((entry) => formatTimestamp(entry.timestamp));
  humidityChart.data.labels = labels;
  humidityChart.data.datasets[0].data = humidity;
  humidityChart.update();
};

const updateCOChart = async () => {
  const data = await fetchArduinoData();
  if (!data.length) return;
  const coValues = data.map((entry) => entry.sensors.co?.value ?? null);
  const labels = data.map((entry) => formatTimestamp(entry.timestamp));
  coChart.data.labels = labels;
  coChart.data.datasets[0].data = coValues;
  coChart.update();
};

const updateCO2Chart = async () => {
  const data = await fetchArduinoData();
  if (!data.length) return;
  const co2Values = data.map((entry) => entry.sensors.co2?.value ?? null);
  const labels = data.map((entry) => formatTimestamp(entry.timestamp));
  co2Chart.data.labels = labels;
  co2Chart.data.datasets[0].data = co2Values;
  co2Chart.update();
};
document.addEventListener("DOMContentLoaded", async function () {
  const cloudsContainer = document.querySelector(".clouds");

  function createCloud() {
    const cloud = document.createElement("div");
    cloud.classList.add("cloud");

    const width = Math.random() * (300 - 150) + 150;
    const height = width * 0.6;
    cloud.style.width = `${width}px`;
    cloud.style.height = `${height}px`;

    const top = Math.random() * window.innerHeight;
    const left = Math.random() * window.innerWidth;
    cloud.style.top = `${top}px`;
    cloud.style.left = `${left}px`;

    const animationDuration = Math.random() * (100 - 60) + 60;
    cloud.style.animationDuration = `${animationDuration}s`;

    cloudsContainer.appendChild(cloud);
  }

  for (let i = 0; i < 30; i++) {
    createCloud();
  }

  refreshAllCharts();

  const data = await fetchArduinoData();
  if (data.length) {
    const latest = data[data.length - 1];
    generateEnvironmentAdvice(latest);
  }

  setInterval(refreshAllCharts, 35000);
});

const tempChart = new Chart(document.getElementById("tempChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: [],
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: false },
    },
  },
});

const humidityChart = new Chart(document.getElementById("humidityChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Humidité (%)",
        data: [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        fill: true,
        tension: 0.4,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: false },
    },
  },
});

const coChart = new Chart(document.getElementById("coChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "CO (ppm)",
        data: [],
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Warning Level CO",
        data: Array(10).fill(9),
        borderColor: "rgba(220, 53, 69, 0.8)",
        backgroundColor: "rgba(220, 53, 69, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: "+1",
        pointStyle: false,
      },
      {
        label: "Normal Level CO max",
        data: Array(10).fill(3),
        borderColor: "rgba(25, 135, 84, 0.8)",
        backgroundColor: "rgba(25, 135, 84, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointStyle: false,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 10,
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(1) + " ppm";
            }
            return label;
          },
        },
      },
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      annotation: {
        annotations: {
          dangerZone: {
            type: "box",
            xScaleID: "x",
            yScaleID: "y",
            yMin: 9,
            yMax: 100,
            backgroundColor: "rgba(220, 53, 69, 0.1)",
            borderColor: "transparent",
            label: {
              display: true,
              content: "Zone dangereuse",
              position: "end",
              backgroundColor: "rgba(220, 53, 69, 0.8)",
              color: "white",
            },
          },
        },
      },
    },
  },
});

const co2Chart = new Chart(document.getElementById("co2Chart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "CO₂ (ppm)",
        data: [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Warning level CO₂",
        data: Array(10).fill(1000),
        borderColor: "rgba(220, 53, 69, 0.8)",
        backgroundColor: "rgba(220, 53, 69, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointStyle: false,
      },
      {
        label: "Normal CO₂ Level max",
        data: Array(10).fill(700),
        borderColor: "rgba(255, 193, 7, 0.8)",
        backgroundColor: "rgba(255, 193, 7, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointStyle: false,
      },
      {
        label: "Niveau idéal CO₂",
        data: Array(10).fill(400),
        borderColor: "rgba(25, 135, 84, 0.8)",
        backgroundColor: "rgba(25, 135, 84, 0.1)",
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointStyle: false,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: false,
        suggestedMin: 300,
        suggestedMax: 1200,
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(0) + " ppm";
            }
            return label;
          },
        },
      },
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      annotation: {
        annotations: {
          dangerZone: {
            type: "box",
            xScaleID: "x",
            yScaleID: "y",
            yMin: 1000,
            yMax: 5000,
            backgroundColor: "rgba(220, 53, 69, 0.1)",
            borderColor: "transparent",
            label: {
              display: true,
              content: "Bad Air Quality",
              position: "end",
              backgroundColor: "rgba(220, 53, 69, 0.8)",
              color: "white",
            },
          },
          warningZone: {
            type: "box",
            xScaleID: "x",
            yScaleID: "y",
            yMin: 700,
            yMax: 1000,
            backgroundColor: "rgba(255, 193, 7, 0.1)",
            borderColor: "transparent",
            label: {
              display: true,
              content: "Recommended ventilation",
              position: "end",
              backgroundColor: "rgba(255, 193, 7, 0.8)",
              color: "black",
            },
          },
          goodZone: {
            type: "box",
            xScaleID: "x",
            yScaleID: "y",
            yMin: 300,
            yMax: 700,
            backgroundColor: "rgba(25, 135, 84, 0.1)",
            borderColor: "transparent",
            label: {
              display: true,
              content: "Good Air Quality",
              position: "start",
              backgroundColor: "rgba(25, 135, 84, 0.8)",
              color: "white",
            },
          },
        },
      },
    },
  },
});

const refreshAllCharts = () => {
  updateTemperatureChart();
  updateHumidityChart();
  updateCOChart();
  updateCO2Chart();
  updateHeaderValues();
};
