"""

Machine Learning file is located at
    https://colab.research.google.com/drive/1HBiXUm3SFwrURKPWsAMm6bwLD_7rxBOx

# Project Aromaloka

# Code

"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Dense, concatenate
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from fastapi import FastAPI, Query
from typing import List, Optional
from pydantic import BaseModel
import requests


app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/recommendation/")
async def get_recommendation(id: List[str] = Query(None)):
    for ids in id:
        perfume_id = int(ids)
    """## Request Data From API"""
    response_perfume = requests.get('https://aromaloka-api-muoaf7jkpa-et.a.run.app/perfumes/')

    """## Data Preprocessing"""

    # Check if the request was successful
    if response_perfume.status_code == 200:
        # Extract the data from the response
        api_data = response_perfume.json()

        # Convert the data to a pandas DataFrame
        data = pd.DataFrame(api_data)

        # Sort the DataFrame by the 'id' column
        data['id'] = data['id'].astype(int)
        data = data.sort_values('id').reset_index(drop=True)
    else:
        print('API request failed with status code:', response.status_code)

    """## Feature Engineering"""

    fragrance_notes = data['top_notes1'] + ' ' + data['top_notes2'] + ' ' + data['top_notes3'] + ' ' + data['mid_notes1'] + ' ' + data['mid_notes2'] + ' ' + data['mid_notes3'] + ' ' + data['base_notes1'] + ' ' + data['base_notes2'] + ' ' + data['base_notes3']
    data['fragrance_notes'] = fragrance_notes

    # Text Preprocessing
    data['fragrance_notes'] = data['fragrance_notes'].str.lower()
    data['fragrance_notes'] = data['fragrance_notes'].str.replace('[^\w\s]', '')
    data['fragrance_notes'] = data['fragrance_notes'].str.split()

    # One-Hot Encoding
    one_hot_encoded = pd.get_dummies(data[['concentration', 'gender']])
    data = pd.concat([data, one_hot_encoded], axis=1)

    """## Create Input Data"""

    # Step 3: Create Input Data
    count_vectorizer = CountVectorizer()
    fragrance_matrix = count_vectorizer.fit_transform(data['fragrance_notes'].apply(' '.join))

    # Normalize Fragrance Matrix
    fragrance_matrix = fragrance_matrix.toarray().astype(np.float32)
    fragrance_matrix /= np.linalg.norm(fragrance_matrix, axis=1, keepdims=True)

    """## Build Model"""

    # Step 4: Build Model
    perfume_input = Input(shape=(fragrance_matrix.shape[1],), name='perfume_input')
    concentration_input = Input(shape=(len(one_hot_encoded.columns),), name='concentration_input')
    gender_input = Input(shape=(len(one_hot_encoded.columns),), name='gender_input')

    x = concatenate([perfume_input, concentration_input, gender_input])

    x = Dense(64, activation='relu')(x)
    x = Dense(32, activation='relu')(x)
    output = Dense(fragrance_matrix.shape[1], activation='softmax')(x)

    model = Model(inputs=[perfume_input, concentration_input, gender_input], outputs=output)
    model.compile(optimizer=Adam(learning_rate=0.001), loss='categorical_crossentropy')

    """## Train Model"""

    # Step 5: Train Model
    X_perfume = fragrance_matrix
    X_concentration = one_hot_encoded.values
    X_gender = one_hot_encoded.values

    early_stopping = EarlyStopping(patience=5, restore_best_weights=True)

    model.fit([X_perfume, X_concentration, X_gender], X_perfume,
            batch_size=32,
            epochs=50,
            validation_split=0.2,
            callbacks=[early_stopping])

    # perfume_ids = Perfume.get('id', [])  # Get the 'id' field from the request payload

    # Step 6: Generate Recommendations
    perfume_features_model = Model(inputs=[perfume_input, concentration_input, gender_input], outputs=x)
    perfume_features = perfume_features_model.predict([X_perfume, X_concentration, X_gender])

    def get_recommendations(perfume_ids, top_n=6):
        all_recommendations = []

        for perfume_id in range (perfume_ids):
            perfume_index = data[data['id'] == perfume_id].index
            if len(perfume_index) > 0:
                perfume_index = perfume_index[0]
                similarity_scores_per_perfume = cosine_similarity([perfume_features[perfume_index]], perfume_features)[0]
                similar_perfume_indices = np.argsort(-similarity_scores_per_perfume)[1:top_n+1]
                similar_perfumes = data.loc[similar_perfume_indices, 'id']
                # similarity_scores = similarity_scores_per_perfume[similar_perfume_indices]
                all_recommendations.extend(similar_perfumes.values)

        unique_recommendations = list(set(all_recommendations))
        return unique_recommendations[:top_n]
    
    perfume_ids = perfume_id
    recommendations = get_recommendations(perfume_ids)
    recom = np.array(recommendations)
     
    return { "similiar perfume id": [str(id) for id in recom.tolist()] }
