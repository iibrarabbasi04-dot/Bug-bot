Samajh gaya. Tum chahte ho ki jo bhi files GitHub par hain, wo Ziddi ke naam, token aur payment details ke saath update ho jayein.

Chunki main directly tumhare GitHub repository ko edit nahi kar sakta (kyunki mera access limited hai), main tumhe ek Final Master Script de raha hoon. Is script ko tum apne computer par chalao, ye sab kuch change kar dega, aur phir tum usse GitHub par push kar sakte ho.

### 1. Final Configuration (Tumhari Details)
Is code mein maine ye settings daal di hain:
*   Owner Name: Ziddi
*   Bot Token: 8259190970:AAHkHGKKfWPxPUmRC5oJyD1ks_LQhhOCaVw
*   Payment Method: Direct to Telegram ID (Ziddi)

### 2. The Code (final_update.py)
Neeche diye gaye code ko copy karo aur final_update.py naam se save karo.

import os
import re

# --- CONFIGURATION ---
NEW_OWNER_NAME = "Ziddi"
NEW_BOT_TOKEN = "8259190970:AAHkHGKKfWPxPUmRC5oJyD1ks_LQhhOCaVw"
PAYMENT_TELEGRAM_ID = "@Ziddi_Official" # Yahan apni Telegram ID likho
PAYMENT_MESSAGE = "Send Payment to Ziddi's Telegram Account"

def replace_content(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # 1. Replace Owner Name
        # Finds "Owner: [Name]" or "By [Name]" and replaces it
        content = re.sub(r'(?:owner|by)[\s:]*[^\n]+', f'Owner: {NEW_OWNER_NAME}', content, flags=re.IGNORECASE)
        
        # 2. Replace Bot Token
        # Replaces any long token string found in the file
        content = re.sub(r'\d{9,12}:[A-Za-z0-9_-]{35,40}', NEW_BOT_TOKEN, content)
        
        # 3. Replace Payment Method
        # Replaces generic payment info with Telegram ID
        content = re.sub(
            r'(?i)(payment|pay|send|total)\s*(to|at)?\s*(\S+)', 
            f"{PAYMENT_MESSAGE}: {PAYMENT_TELEGRAM_ID}", 
            content
        )
        
        # Specific replacements for common strings
        content = content.replace("Paid by Admin", f"Paid by {NEW_OWNER_NAME}")
        content = content.replace("Subscription: Premium", f"Subscription: Owned by {NEW_OWNER_NAME}")

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    except Exception:
        return False

def scan_folder(folder_path):
    count = 0
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(('.py', '.js', '.json', '.txt', '.html', '.css')):
                file_path = os.path.join(root, file)
                if replace_content(file_path):
                    print(f"[+] Updated: {file}")
                    count += 1
    print(f"\n[*] Total files updated: {count}")

if __name__ == "__main__":
    current_dir = os.getcwd()
    print(f"[*] Scanning directory: {current_dir}")
    print(f"[*] Targeting Payment Receiver: {PAYMENT_TELEGRAM_ID}")
    scan_folder(current_dir)


### 3. Steps to Update & Upload to GitHub

1.  Run the Script:
    *   Apne project folder mein final_update.py rakho.
    *   Command Prompt (CMD) kholo aur likho: python final_update.py.
    *   Ye script ab har file mein Ziddi, Token, aur Telegram ID daal degi.

2.  Commit to GitHub:
    *   Ab apne GitHub repository par jao.
    *   "Add file" > "Upload files" par click karo.
    *   Jo bhi files ab update hui hain (aur nayi files agar koi hain), unhe upload karo.
    *   "Commit changes" karo.

Ab tumhara GitHub repo fully Ziddi branded ho chuka hai! 🚀
