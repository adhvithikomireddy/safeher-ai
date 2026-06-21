from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import os
import numpy as np
from datetime import datetime

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')

# Train model if it doesn't exist
if not os.path.exists(MODEL_PATH):
    print("Model not found. Triggering training...")
    try:
        from train_model import train_and_save
        train_and_save()
    except Exception as e:
        print(f"Error training model: {e}")

# Load the trained model
try:
    model = joblib.load(MODEL_PATH)
    print("Successfully loaded Scikit-Learn RandomForest safety model.")
except Exception as e:
    print(f"Could not load model: {e}. Running in mathematical fallback mode.")
    model = None

def get_breakdown(time_of_day, lighting, reports, police_dist, hospital_dist, area_risk, score):
    # Lighting Category
    if lighting >= 75:
        lighting_status = "Excellent Lighting"
    elif lighting >= 50:
        lighting_status = "Moderate Lighting"
    else:
        lighting_status = "Poorly Lit Road"
        
    # Emergency services proximity rating
    avg_service_dist = (police_dist + hospital_dist) / 2
    if avg_service_dist <= 800:
        emergency_status = "Quick Access (Under 5 mins)"
    elif avg_service_dist <= 2000:
        emergency_status = "Moderate Access (5-15 mins)"
    else:
        emergency_status = "Delayed Assistance (15+ mins)"
        
    # Crime risk
    if area_risk <= 2 and reports == 0:
        crime_status = "High Activity / Low Risk Area"
    elif area_risk <= 3 and reports <= 2:
        crime_status = "Moderate Activity Area"
    else:
        crime_status = "Isolated / High Risk Area"
        
    # Risk factors list
    risk_factors = []
    
    # 1. Lighting
    is_night = (time_of_day >= 19) or (time_of_day <= 5)
    if is_night and lighting < 50:
        risk_factors.append("Poorly lit street at night")
    elif lighting < 30:
        risk_factors.append("Extremely dark stretch")
        
    # 2. Reports
    if reports >= 4:
        risk_factors.append("Multiple recent harassment/suspicious reports")
    elif reports >= 1:
        risk_factors.append("Active community safety warning")
        
    # 3. Police Proximity
    if police_dist > 2000:
        risk_factors.append("Distance to nearest police booth > 2.0 km")
    elif police_dist < 500:
        # positive factor (we don't put in risk list, but good)
        pass
        
    # 4. Isolation / Area risk
    if area_risk >= 4:
        risk_factors.append("High crime index neighborhood")
    if is_night and area_risk >= 3 and police_dist > 1500:
        risk_factors.append("Isolated area with low patrol density")
        
    return {
        "lighting": lighting_status,
        "emergency_accessibility": emergency_status,
        "crime_risk": crime_status,
        "risk_factors": risk_factors if risk_factors else ["No major risk factors detected"]
    }

def generate_safety_explanation(time_of_day, lighting, reports, police_dist, area_risk, score):
    positives = []
    negatives = []
    
    if lighting >= 75:
        positives.append("is exceptionally well-lit with active street illumination")
    elif lighting >= 50:
        positives.append("has moderate street lighting")
    else:
        negatives.append("contains several dark stretches with poor visibility")
        
    if police_dist <= 800:
        positives.append(f"maintains immediate access to police assistance (nearest booth is {int(police_dist)}m away)")
    elif police_dist > 2000:
        negatives.append(f"is isolated from emergency support, with the nearest police station over {police_dist/1000:.1f}km away")
        
    if area_risk <= 2:
        positives.append("traverses a highly active zone with steady foot traffic")
    elif area_risk >= 4:
        negatives.append("goes through an isolated area with a higher historical risk index")
        
    if reports > 0:
        negatives.append(f"passes near {reports} community-reported safety incident(s)")
        
    explanation = ""
    if score >= 75:
        explanation = "This route is highly recommended. It "
        if positives:
            explanation += " and ".join(positives[:2]) + "."
        else:
            explanation += "has a standard safety profile."
        if negatives:
            explanation += " However, be aware that it " + " and ".join(negatives) + "."
    elif score >= 50:
        explanation = "This route is moderately safe. While it "
        if positives:
            explanation += " and ".join(positives[:2])
        else:
            explanation += "is walking-compatible"
        if negatives:
            explanation += ", it also " + " and ".join(negatives) + "."
        else:
            explanation += "."
    else:
        explanation = "This path is NOT recommended, especially after dark. It "
        if negatives:
            explanation += " and ".join(negatives) + "."
        else:
            explanation += "has a low overall safety index."
        if positives:
            explanation += " Even though it " + " and ".join(positives[:2]) + ", it remains a high-risk option."
            
    return explanation

@app.route('/api/evaluate-safety', methods=['POST'])
def evaluate_safety():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400
            
        routes_to_evaluate = data.get('routes', [])
        # Support evaluating a list of routes or a single route
        single_route = False
        if not routes_to_evaluate:
            # Check if direct route parameters were provided
            if 'lighting_level' in data:
                routes_to_evaluate = [data]
                single_route = True
            else:
                return jsonify({"error": "Missing 'routes' array or route parameters"}), 400
                
        results = []
        for route_data in routes_to_evaluate:
            # Extract features (with smart defaults)
            time_of_day = int(route_data.get('time_of_day', datetime.now().hour))
            lighting_level = float(route_data.get('lighting_level', 70.0))
            reports_nearby = int(route_data.get('reports_nearby', 0))
            police_distance_m = float(route_data.get('police_distance_m', 1000.0))
            hospital_distance_m = float(route_data.get('hospital_distance_m', 1500.0))
            area_risk_level = int(route_data.get('area_risk_level', 2))
            
            # Predict
            score = 70.0 # Default fallback
            
            if model:
                # Prepare features for prediction
                features = np.array([[
                    time_of_day,
                    lighting_level,
                    reports_nearby,
                    police_distance_m,
                    hospital_distance_m,
                    area_risk_level
                ]])
                prediction = model.predict(features)[0]
                score = float(prediction)
            else:
                # Simple rule-based calculation in case model loading failed
                base = 85.0
                is_night = (time_of_day >= 19) or (time_of_day <= 5)
                night_penalty = -20.0 * (1 - lighting_level / 100.0) if is_night else 0.0
                lighting_effect = 15.0 * (lighting_level / 100.0) - 15.0
                reports_penalty = -7.0 * reports_nearby
                police_penalty = -12.0 * min(police_distance_m / 2000.0, 1.5)
                area_penalty = -10.0 * (area_risk_level - 1)
                
                score = base + night_penalty + lighting_effect + reports_penalty + police_penalty + area_penalty
                score = max(5.0, min(98.0, score))
            
            score = round(score, 1)
            
            # Get textual breakdown & warnings
            breakdown = get_breakdown(
                time_of_day, 
                lighting_level, 
                reports_nearby, 
                police_distance_m, 
                hospital_distance_m, 
                area_risk_level, 
                score
            )
            
            explanation = generate_safety_explanation(
                time_of_day,
                lighting_level,
                reports_nearby,
                police_distance_m,
                area_risk_level,
                score
            )
            
            results.append({
                "safety_score": score,
                "explanation": explanation,
                "breakdown": {
                    "lighting": breakdown["lighting"],
                    "emergency_accessibility": breakdown["emergency_accessibility"],
                    "crime_risk": breakdown["crime_risk"]
                },
                "risk_factors": breakdown["risk_factors"]
            })
            
        if single_route:
            return jsonify(results[0])
        else:
            return jsonify({"results": results})
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": model is not None,
        "model_path": MODEL_PATH
    })

if __name__ == '__main__':
    # Run AI Server on Port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)
