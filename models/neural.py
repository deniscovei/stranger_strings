import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils import class_weight
from sklearn.metrics import f1_score, recall_score, precision_score, accuracy_score, roc_auc_score
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from preprocessing import preprocess_pipeline

X_train, X_test, y_train, y_test, df = preprocess_pipeline('./dataset/resampled_data.csv')

# 2. Preprocesare (scalare)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 3. Split stratificat
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, stratify=y, random_state=42
)

# 4. Calcul class weights
class_weights = class_weight.compute_class_weight(
    class_weight='balanced',
    classes=[0, 1],
    y=y_train
)
class_weights = dict(enumerate(class_weights))

# 5. Modelul de rețea neurală
model = keras.Sequential([
    layers.Dense(128, activation='relu', input_shape=(X_train.shape[1],)),
    layers.BatchNormalization(),
    layers.Dropout(0.4),
    layers.Dense(64, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.3),
    layers.Dense(32, activation='relu'),
    layers.BatchNormalization(),
    layers.Dropout(0.2),
    layers.Dense(1, activation='sigmoid')
])

def focal_loss(gamma=2., alpha=.25):
    def focal_loss_fixed(y_true, y_pred):
        bce = keras.losses.binary_crossentropy(y_true, y_pred)
        pt = tf.where(tf.equal(y_true, 1), y_pred, 1 - y_pred)
        return alpha * tf.pow(1. - pt, gamma) * bce
    return focal_loss_fixed

model.compile(
    optimizer='adam',
    loss=focal_loss(gamma=2, alpha=0.25),  # Poți schimba cu 'binary_crossentropy'
    metrics=['Recall', 'Precision', keras.metrics.AUC()]
)

history = model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    batch_size=256,
    epochs=25,
    class_weight=class_weights,
    callbacks=[keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)]
)

# --- Evaluare completă pe setul de test ---
y_pred_proba = model.predict(X_test)
y_pred = (y_pred_proba >= 0.5).astype(int)

print("F1-score:", f1_score(y_test, y_pred))
print("Recall:", recall_score(y_test, y_pred))
print("Precision:", precision_score(y_test, y_pred))
print("Accuracy:", accuracy_score(y_test, y_pred))
print("AUC:", roc_auc_score(y_test, y_pred_proba))
