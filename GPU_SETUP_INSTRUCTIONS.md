# PyTorch CUDA Installation Commands

## Step 1: Create Python 3.11 Virtual Environment

```bash
py -3.11 -m venv gpu_env
```

## Step 2: Activate the Environment

```bash
gpu_env\Scripts\activate
```

## Step 3: Install PyTorch with CUDA 12.1 Support (2.4GB)

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

## Step 4: Verify GPU is Working

```bash
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available()); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None')"
```

## Step 5: Install Other Required Packages

```bash
pip install sentence-transformers pandas scikit-learn numpy
```

## Step 6: Test Sentence-Transformers with GPU

```bash
python -c "from sentence_transformers import SentenceTransformer; m = SentenceTransformer('BAAI/bge-large-en-v1.5'); print('Model device:', m.device)"
```

## After Installation - Run Training with GPU

```bash
cd django_pg_backend/core
set CUDA_VISIBLE_DEVICES=0
python manage.py train_models_v2
```

## Expected Output When Working:

```
PyTorch: 2.5.1+cu121
CUDA: True
GPU: NVIDIA GeForce RTX 3050
Model device: cuda
```
