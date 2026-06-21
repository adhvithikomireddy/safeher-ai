import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

def generate_synthetic_data(num_samples=3000):
    np.random.seed(42)
    
    # Generate random features
    time_of_day = np.random.randint(0, 24, size=num_samples)
    lighting_level = np.random.uniform(10, 100, size=num_samples)
    reports_nearby = np.random.randint(0, 8, size=num_samples)
    police_distance_m = np.random.uniform(50, 4000, size=num_samples)
    hospital_distance_m = np.random.uniform(100, 5000, size=num_samples)
    area_risk_level = np.random.randint(1, 6, size=num_samples) # 1 to 5
    
    # Mathematical formulation for safety score calculation + noise
    # Base safety score is 85
    base_score = 85.0
    
    # Night effect (hours between 7 PM and 6 AM)
    is_night = (time_of_day >= 19) | (time_of_day <= 5)
    night_penalty = np.where(is_night, -20.0 * (1 - lighting_level / 100.0) - 8.0 * (area_risk_level - 1), 0.0)
    
    # Lighting effect (lower lighting always penalizes, but much worse at night)
    lighting_effect = 15.0 * (lighting_level / 100.0) - 15.0
    
    # Community reports penalty
    reports_penalty = -7.0 * reports_nearby
    
    # Distance to police station penalty (linear penalty scaling up to 3km)
    police_penalty = -12.0 * np.minimum(police_distance_m / 2000.0, 1.5)
    
    # Distance to hospital penalty (smaller impact)
    hospital_penalty = -5.0 * np.minimum(hospital_distance_m / 2000.0, 2.0)
    
    # Area risk level penalty (1 to 5 scale, 5 being highest risk)
    area_risk_penalty = -10.0 * (area_risk_level - 1)
    
    # Combine components
    scores = base_score + night_penalty + lighting_effect + reports_penalty + police_penalty + hospital_penalty + area_risk_penalty
    
    # Add random noise (representing other unmeasured environmental factors)
    noise = np.random.normal(0, 3.0, size=num_samples)
    final_scores = scores + noise
    
    # Clip scores to realistic boundaries [5%, 98%]
    final_scores = np.clip(final_scores, 5.0, 98.0)
    
    # Build dataframe
    df = pd.DataFrame({
        'time_of_day': time_of_day,
        'lighting_level': lighting_level,
        'reports_nearby': reports_nearby,
        'police_distance_m': police_distance_m,
        'hospital_distance_m': hospital_distance_m,
        'area_risk_level': area_risk_level,
        'safety_score': final_scores
    })
    
    return df

def train_and_save():
    print("Generating synthetic safety training dataset...")
    df = generate_synthetic_data()
    
    X = df[['time_of_day', 'lighting_level', 'reports_nearby', 'police_distance_m', 'hospital_distance_m', 'area_risk_level']]
    y = df['safety_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Training Random Forest Regressor model...")
    model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"Model Evaluation Results:")
    print(f" - Mean Squared Error (MSE): {mse:.4f}")
    print(f" - R-squared (R2) Score: {r2:.4f}")
    
    # Save the model
    model_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, 'model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved successfully to {model_path}")
    
if __name__ == '__main__':
    train_and_save()
