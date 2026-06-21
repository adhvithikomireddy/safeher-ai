// Node.js test script to verify API routing and AI prediction pipeline
const payload = {
  routes: [
    {
      id: 'route-a',
      name: 'Janpath Road (Safest CP Path)',
      time: '20 min',
      distance: '5.2 km',
      coordinates: [
        [28.6304, 77.2177],
        [28.6250, 77.2185],
        [28.6129, 77.2295]
      ],
      tags: ['Well-lit', 'High Activity'],
      lighting_level: 95.0,
      area_risk_level: 1
    },
    {
      id: 'route-b',
      name: 'Dark Bypass (Riskier CP Path)',
      time: '15 min',
      distance: '4.5 km',
      coordinates: [
        [28.6304, 77.2177],
        [28.6180, 77.2280],
        [28.6129, 77.2295]
      ],
      tags: ['Poorly Lit'],
      lighting_level: 20.0,
      area_risk_level: 4
    }
  ],
  time_of_day: 22 // 10 PM
};

async function testPipeline() {
  console.log("Sending routes evaluation request to backend API (http://localhost:3001/api/routes/evaluate)...");
  
  try {
    const res = await fetch('http://localhost:3001/api/routes/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Server returned status ${res.status}`);
    }

    const data = await res.json();
    console.log("\n--- API EVALUATION SUCCESS ---");
    console.log(`Evaluated routes using: ${data.source}\n`);
    
    data.routes.forEach(route => {
      console.log(`Route: ${route.name}`);
      console.log(` - Safety Score: ${route.safetyScore}%`);
      console.log(` - Lighting level: ${route.lighting_level}%`);
      console.log(` - Reports nearby: ${route.reports_nearby}`);
      console.log(` - Police proximity: ${route.police_distance_m}m`);
      console.log(` - Hospital proximity: ${route.hospital_distance_m}m`);
      console.log(` - Area Risk Level: ${route.area_risk_level}`);
      console.log(` - Predicted Breakdown:`);
      console.log(`     * Lighting: ${route.breakdown.lighting}`);
      console.log(`     * Emergency Proximity: ${route.breakdown.emergency_accessibility}`);
      console.log(`     * Crime Risk: ${route.breakdown.crime_risk}`);
      console.log(` - Risk Factors: ${JSON.stringify(route.risk_factors)}\n`);
    });
  } catch (err) {
    console.error("Test pipeline failed:", err.message);
  }
}

testPipeline();
