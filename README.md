# Mail Triage - AutoU

An intelligent email classification and response generation application that uses AI to automatically categorize emails as "Productive" or "Unproductive" and suggests appropriate responses.

## 🚀 Features

- **AI-Powered Classification**: Uses Google Gemini API to classify emails as Productive or Unproductive
- **Smart Response Generation**: Automatically generates contextual email responses
- **File Upload Support**: Upload .txt and .pdf files for email content
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Real-time Processing**: Asynchronous background processing with status updates
- **Local Storage**: Browser-based email storage and persistence
- **Bilingual Support**: English and Portuguese keyword detection

## 🏗️ Architecture

### Frontend
- **Technology**: Vanilla JavaScript with Tailwind CSS
- **Storage**: Browser localStorage for email persistence
- **Pattern**: Master-detail layout with compose functionality

### Backend
- **Framework**: FastAPI with async support
- **AI Integration**: Google Gemini API for classification and response generation
- **Architecture**: Clean separation with models, services, and API layers
- **Processing**: Asynchronous background task processing

## 📋 Prerequisites

- Python 3.8 or higher
- Google Gemini API key (optional - app works with fallback heuristics)
- Modern web browser

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd autou
```

### 2. Create Virtual Environment
```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```


**Note**: The application now requires a Gemini API key for classification and response generation. Offline/local classification is no longer supported.

### 5. Start the Backend Server
```bash
# From the project rootp
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 6. Open the Frontend
Open `index.html` in your web browser or serve it using a local server:
```bash
# Using Python's built-in server
python -m http.server 3000

# Then open: http://localhost:3000
```

## 🎯 Usage

### Creating New Emails
1. Click the "New Email" button in the header
2. Enter email title and content manually, or
3. Upload a .txt or .pdf file by dragging and dropping or using the file selector
4. Click "Save Email" to process

### Viewing Results
- Emails are automatically classified as "Productive" or "Unproductive"
- AI-generated responses appear in the "AI Suggested Response" section
- Classification badges show the result with color coding:
  - 🟢 Green: Productive
  - 🟡 Amber: Unproductive
  - 🔵 Blue: Processing/Pending
  - 🔴 Red: Error

### Retry Failed Processing
- If processing fails, click the "Retry" button to reprocess the email

## 🔧 API Endpoints

### POST `/emails`
Create a new email for processing
```json
{
  "title": "Email subject",
  "content": "Email content"
}
```

### GET `/emails/{email_id}`
Get the processing status and results
```json
{
  "id": "uuid",
  "status": "done",
  "classification": "Productive",
  "suggested_reply": "AI generated response"
}
```

## 🧠 AI Integration

### Gemini API Configuration
- **Model**: gemini-2.5-flash
- **Temperature**: 0.4 for consistent responses
- **Max Tokens**: 256 for response generation

#### Important: Gemini Model Version

You must set the following in your `.env` file for the application to work correctly:

```
GEMINI_MODEL=gemini-2.5-flash
```

Other model versions may not work with this backend.


### Classification System
Classification and response generation are performed exclusively via the Gemini API. Offline/local fallback heuristics are no longer used.

### Supported Languages
- English
- Portuguese (Brazil)

## 📁 Project Structure

```
autou/
├── app/
│   ├── __pycache__/
│   ├── api.py          # FastAPI routes and endpoints
│   ├── main.py         # Application entry point
│   ├── models.py       # Pydantic data models
│   └── services.py     # AI processing and business logic
├── venv/               # Python virtual environment
├── index.html          # Frontend HTML
├── theme.css           # Theme classes and variables
├── app.js              # Frontend JavaScript logic
├── api.js              # API communication layer
├── requirements.txt    # Python dependencies
├── README.md           # This file
└── .env                # Environment variables (create this)
```

## 🐛 Troubleshooting

### Common Issues

**Backend won't start:**
- Ensure Python 3.8+ is installed
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`

**Frontend can't connect to backend:**
- Verify backend is running on `http://127.0.0.1:8000`
- Check browser console for CORS errors
- Ensure no firewall blocking port 8000

**AI features not working:**
- Check if `GEMINI_API_KEY` is set in `.env`
- Verify API key is valid and has proper permissions
- Check network connectivity

**File upload issues:**
- Only .txt and .pdf files are supported
- PDF parsing is not fully implemented (filename preview only)
- Use .txt files for best results

## 🔮 Future Enhancements

- [ ] Database persistence (currently in-memory)
- [ ] Email provider integration (Gmail, Outlook)
- [ ] Advanced AI features (sentiment analysis, priority scoring)
- [ ] Bulk email processing
- [ ] Search and filtering capabilities
- [ ] Export functionality

## 📄 License

This project is personal of mine to demonstrate python features and front end integrations, feel free to use anything since this will serve as portifolio.

---

**Built with ❤️ using FastAPI, Google Gemini AI, and modern web technologies.**
