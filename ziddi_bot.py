
### 🚀 Ziddi Ultimate Bot Code (
ziddi_bot.py
)

```python
import telebot
import requests
import re
import json
import os
import random
from datetime import datetime

# ==========================================
# ⚙️ CONFIGURATION (Ziddi Settings)
# ==========================================
BOT_TOKEN = "8259190970:AAHkHGKKfWPxPUmRC5oJyD1ks_LQhhOCaVw"
OWNER_NAME = "Ziddi"
PAYMENT_RECEIVER = "@Ziddi_Official" # Apni Telegram ID yahan likho
GITHUB_PAGES_URL = "https://<your-username>.github.io/<repo-name>/index.html"
PAYMENT_DB_FILE = "ziddi_payments.json"

# Initialize Bot
bot = telebot.TeleBot(BOT_TOKEN)

# --- Helper Functions ---

def load_payments():
    """Load payment data from JSON file."""
    if not os.path.exists(PAYMENT_DB_FILE):
        return {}
    with open(PAYMENT_DB_FILE, 'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def save_payments(data):
    """Save payment data to JSON file."""
    with open(PAYMENT_DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

def fetch_system_status():
    """Fetch live data from GitHub Pages."""
    try:
        response = requests.get(GITHUB_PAGES_URL)
        if response.status_code == 200:
            html = response.text
            # Extract Owner Name
            owner_match = re.search(r'<strong>Owner:</strong>\s(.?)</div>', html)
            owner = owner_match.group(1).strip() if owner_match else OWNER_NAME
            
            # Extract Token (if you want it dynamic, otherwise use fixed)
            token_match = re.search(r'class="token">(.*?)</div>', html)
            token = token_match.group(1).strip() if token_match else BOT_TOKEN
            
            return {"owner": owner, "token": token, "status": "Online"}
        else:
            return {"owner": OWNER_NAME, "token": BOT_TOKEN, "status": "GitHub Offline"}
    except Exception:
        return {"owner": OWNER_NAME, "token": BOT_TOKEN, "status": "Connection Error"}

# --- Commands ---

@bot.message_handler(commands=['start'])
def send_welcome(message):
    status = fetch_system_status()
    bot.reply_to(message, 
        f"👋 Welcome to the {status['owner']} System!\n\n"
        f"✅ Status: {status['status']}\n"
        f"💳 Send Payments to: {PAYMENT_RECEIVER}\n"
        f"Use /pay to check your status or buy Premium.", 
        parse_mode="Markdown")

@bot.message_handler(commands=['pay'])
def handle_payment_request(message):
    chat_id = message.chat.id
    payments = load_payments()
    
    # Generate unique Reference ID
    ref_id = f"ZID-{random.randint(10000, 99999)}"
    
    # Store pending request
    payments[ref_id] = {
        "user_id": chat_id,
        "username": message.from_user.username or "Anonymous",
        "status": "pending",
        "date": str(datetime.now())
    }
    save_payments(payments)
    
    bot.reply_to(message, 
        f"💰 Payment Instructions\n\n"
        f"Send funds to: {PAYMENT_RECEIVER}\n"
        f"Make sure to include this Reference ID in the note:\n\n"
        f"🔑 Ref:
{ref_id}
\n\n"
        f"Once paid, I will verify and activate your Premium!", 
        parse_mode="Markdown")

@bot.message_handler(commands=['verify'])
def verify_payment_command(message):
    # Check if sender is Owner (replace 'Ziddi_Official' with your actual username)
    if message.from_user.username != "Ziddi_Official":
        bot.reply_to(message, "🔒 Only Owner can verify payments.")
        return
        
    args = message.text.split()
    if len(args) < 2:
        bot.reply_to(message, "Usage:
/verify <Ref_ID>
")
        return
        
    ref_id = args[1]
    payments = load_payments()
    
    if ref_id in payments:
    if payments[ref_id]["status"] == "verified":
            bot.reply_to(message, f"❌ {ref_id} is already verified.")
            return
            
        # Update status
        payments[ref_id]["status"] = "verified"
        payments[ref_id]["verified_by"] = OWNER_NAME
        payments[ref_id]["verified_at"] = str(datetime.now())
        save_payments(payments)
        
        # Notify User
        user_id = payments[ref_id]["user_id"]
        try:
            bot.send_message(user_id, 
                f"✅ Payment Verified!\n\n"
                f"You are now a {OWNER_NAME} Premium member.\n"
                f"Ref:
{ref_id}
\n"
                f"Enjoy the features!", 
                parse_mode="Markdown")
            bot.reply_to(message, f"✅ Verified {ref_id} successfully!")
        except Exception:
            bot.reply_to(message, f"Verified {ref_id}, but user might have blocked bot.")
    else:
        bot.reply_to(message, f"❌ Invalid Reference ID:
{ref_id}
")

@bot.message_handler(commands=['info'])
def show_info(message):
    status = fetch_system_status()
    reply_text = (
        f"👑 {OWNER_NAME} System Info\n\n"
        f"👤 Owner: {status['owner']}\n"
        f"🔑 Token:
{status['token']}
\n"
        f"💳 Payment To: {PAYMENT_RECEIVER}\n"
        f"✅ Server Status: {status['status']}"
    )
    bot.reply_to(message, reply_text, parse_mode="Markdown")

print(f"[] Starting {OWNER_NAME} Bot...")
print(f"[] Monitoring for payments at {PAYMENT_RECEIVER}")
try:
    bot.infinity_polling()
except KeyboardInterrupt:
    print("\n[*] Bot stopped by owner.")
```
