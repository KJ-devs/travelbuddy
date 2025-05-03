const labels = Array.from({ length: 10 }, (_, i) => `${i + 1} sec`);

const tempChart = new Chart(document.getElementById("tempChart"), {
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: "Température",
        data: [22, 22.3, 22.5, 22.4, 22.7, 23, 23.2, 23.3, 23.1, 23.0],
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
      y: {
        beginAtZero: false,
      },
    },
  },
});

const humidityChart = new Chart(document.getElementById("humidityChart"), {
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: "Humidité",
        data: [45, 46, 47, 46.5, 48, 49, 50, 51, 50.5, 50],
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
      y: {
        beginAtZero: false,
      },
    },
  },
});

const motionChart = new Chart(document.getElementById("motionChart"), {
  type: "bar",
  data: {
    labels,
    datasets: [
      {
        label: "Mouvement détecté",
        data: [1, 0, 0, 1, 1, 0, 1, 0, 0, 1],
        backgroundColor: "#10b981",
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => (value ? "Oui" : "Non"),
        },
      },
    },
  },
});
