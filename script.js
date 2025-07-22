// Récupération du DOM et variables
let hum_soil_display = document.getElementById("hum_soil");
let hum_air_display = document.getElementById("hum_air");
let temp_air_display = document.getElementById("temp_air");
let params_display = [hum_air_display, hum_soil_display, temp_air_display];

let pompe_status = document.getElementById("pompe_status");
let seuil_hum = 600;

// --- Nouvelles variables pour les GRAPHIQUES individuels ---
// Récupération des contextes 2D pour chaque canvas
const ctx_temp_air = document.getElementById('stats-temp-air')?.getContext('2d');
const ctx_hum_air = document.getElementById('stats-hum-air')?.getContext('2d');
const ctx_hum_soil = document.getElementById('stats-hum-soil')?.getContext('2d');

// Instances de Chart.js pour chaque graphique
let chartTempAir;
let chartHumAir;
let chartHumSoil;

// Données pour chaque graphique
let tempAirLabels = [];
let tempAirDataPoints = [];

let humAirLabels = [];
let humAirDataPoints = [];

let humSoilLabels = [];
let humSoilDataPoints = [];

const MAX_CHART_POINTS = 10; // Nombre max de points sur chaque graphique

// --- Fonctions de génération de données (avec valeurs de test indépendantes) ---
// Variables distinctes pour simuler la progression de chaque donnée
// Fonction pour générer les données aléatoires
function generateData(min, max) {
    return Math.random() * (max - min) + min;
}
// Génération des données en fonction des paramètres
const tempAirData = () => generateData(20, 100);
const humAirData = () => generateData(0, 100);
const humSoilData = () => generateData(0, 1024);


// Fonction de mise à jour des données brutes
function updateData() {
    return {
        "hum_air": humAirData(),
        "hum_soil": humSoilData(),
        "temp_air": tempAirData()
    }
}

// --- Fonctions d'initialisation des graphiques ---
function initializeChart(ctx, label, borderColor, backgroundColor, dataPointsArray, labelsArray, yAxisMax = null) {
    // Vérifier si le contexte est valide avant de créer le graphique
    if (!ctx) {
        console.error(`Erreur: Contexte 2D non trouvé pour le graphique avec le label "${label}". Vérifiez l'ID du canvas dans le HTML.`);
        return null; // Retourne null si le contexte n'est pas trouvé
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsArray,
            datasets: [{
                label: label,
                data: dataPointsArray,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                fill: false,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: 'Temps'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: yAxisMax, // Permet de définir une limite max sur l'axe Y si besoin
                    title: {
                        display: true,
                        text: 'Valeur'
                    }
                }
            },
            animation: false
        }
    });
}

function initializeAllCharts() {
    console.log("Initialisation de tous les graphiques...");
    // Initialisation du graphique de Température de l'Air
    chartTempAir = initializeChart(
        ctx_temp_air,
        "Température de l'Air (°C)",
        'rgba(255, 99, 132, 1)',
        'rgba(255, 99, 132, 0.2)',
        tempAirDataPoints,
        tempAirLabels,
        100 // Température max de l'air est 100
    );
    if (chartTempAir) console.log("Graphique Température Air initialisé.");

    // Initialisation du graphique d'Humidité de l'Air
    chartHumAir = initializeChart(
        ctx_hum_air,
        "Humidité de l'Air (%)",
        'rgba(54, 162, 235, 1)',
        'rgba(54, 162, 235, 0.2)',
        humAirDataPoints,
        humAirLabels,
        100 // Humidité max de l'air est 100
    );
    if (chartHumAir) console.log("Graphique Humidité Air initialisé.");

    // Initialisation du graphique d'Humidité du Sol
    chartHumSoil = initializeChart(
        ctx_hum_soil,
        "Humidité du Sol (valeur brute)",
        'rgba(75, 192, 192, 1)',
        'rgba(75, 192, 192, 0.2)',
        humSoilDataPoints,
        humSoilLabels,
        1024 // Humidité max du sol est 1024
    );
    if (chartHumSoil) console.log("Graphique Humidité Sol initialisé.");
}

// Fonction de mise à jour de l'interface et des graphiques
function updateDataUI() {
    const data = updateData(); // Génération des données une seule fois
    console.log("Données générées:", data);

    // Mise à jour de l'affichage textuel
    params_display.forEach((param) => {
        // Vérifiez si param est null ou undefined avant d'accéder à .id
        if (param && param.id) {
            param.textContent = Math.ceil(data[param.id]) || "---";
        } else {
            console.warn("Élément DOM non trouvé dans params_display ou son ID est manquant.");
        }
    });

    updateStatusPompe(data); // Passe l'objet 'data' complet

    // Ajout des nouvelles données aux tableaux respectifs
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();

    tempAirLabels.push(timeLabel);
    tempAirDataPoints.push(data.temp_air);

    humAirLabels.push(timeLabel);
    humAirDataPoints.push(data.hum_air);

    humSoilLabels.push(timeLabel);
    humSoilDataPoints.push(data.hum_soil);

    // Nettoyage des données excédentaires pour chaque graphique
    cleanDataset(tempAirLabels, tempAirDataPoints);
    cleanDataset(humAirLabels, humAirDataPoints);
    cleanDataset(humSoilLabels, humSoilDataPoints);

    // Mise à jour de chaque graphique
    if (chartTempAir) chartTempAir.update();
    if (chartHumAir) chartHumAir.update();
    if (chartHumSoil) chartHumSoil.update();

    console.log("Données actuelles pour Température Air:", tempAirDataPoints);
    console.log("Labels actuels pour Température Air:", tempAirLabels);
}

function updateStatusPompe(currentData) {
    const humSoilValue = currentData.hum_soil;
    // console.log("Humidité du sol pour la pompe:", humSoilValue); // Commenté pour réduire le bruit dans la console
    if (pompe_status) { // Vérifier si l'élément pompe_status existe
        if (humSoilValue > seuil_hum) {
            pompe_status.textContent = "ON";
            pompe_status.style.color = "green";
        } else {
            pompe_status.textContent = "OFF";
            pompe_status.style.color = "red";
        }
    }
}

// Fonction de nettoyage des données (rendue générique)
function cleanDataset(labelsArray, dataPointsArray) {
    if (labelsArray.length > MAX_CHART_POINTS) {
        labelsArray.shift();
        dataPointsArray.shift();
    }
}

// --- Exécution initiale et intervalle ---
// S'assurer que le DOM est complètement chargé avant d'initialiser les graphiques
document.addEventListener('DOMContentLoaded', () => {
    initializeAllCharts(); // Initialise tous les graphiques au chargement
    updateDataUI(); // Première mise à jour pour afficher les données immédiatement

    setInterval(() => {
        updateDataUI();
    }, 2000);
});
