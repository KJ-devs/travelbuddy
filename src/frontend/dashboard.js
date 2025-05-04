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
    const response = await fetch("http://10.74.254.206:5000/arduino/getData");
    if (!response.ok) throw new Error("Erreur réseau : " + response.statusText);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erreur de récupération des données :", error);
    return [];
  }
};
const updateHeaderValues = async () => {
  const data = await fetchArduinoData();
  if (!data.length) return;

  const latest = data[data.length - 1];
  document.getElementById("temperature").textContent =
    latest.sensors.temperature?.value?.toFixed(1) + "°C" || "N/A";

  document.getElementById("humidity").textContent =
    latest.sensors.humidity?.value?.toFixed(0) + "%" || "N/A";

  const motionDetected = latest.sensors.motion?.value;
  document.getElementById("motionStatus").innerHTML = motionDetected
    ? '<span class="text-green-500">Détecté</span>'
    : '<span class="text-red-500">Non détecté</span>';
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

refreshAllCharts();
setInterval(refreshAllCharts, 35000);
