#!/bin/bash

# ATM Claim API Test Script
# This script demonstrates how to call the ATM Claim API with proper authorization

# Configuration
API_BASE_URL="http://localhost:3000"
USERNAME="user"
PASSWORD="password123"

echo "========================================="
echo "ATM Claim API Testing Script"
echo "========================================="
echo ""

# Step 1: Login to get session cookie
echo "Step 1: Authenticating..."
curl -s -c cookies.txt -X POST "$API_BASE_URL/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD&redirect=false&json=true&csrfToken=" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Authentication successful"
else
    echo "❌ Authentication failed"
    exit 1
fi

# Step 2: Get the session token from cookies
SESSION_TOKEN=$(grep "next-auth.session-token" cookies.txt | awk '{print $7}')
if [ -z "$SESSION_TOKEN" ]; then
    SESSION_TOKEN=$(grep "__Secure-next-auth.session-token" cookies.txt | awk '{print $7}')
fi

echo "Session token obtained: ${SESSION_TOKEN:0:20}..."
echo ""

# Step 3: Create the ATM Claim ticket
echo "Step 2: Creating ATM Claim ticket..."
echo ""

# Sample payload
PAYLOAD='{
  "atm_code": "0126",
  "transaction_date": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "transaction_amount": 2500000,
  "transaction_ref": "REF'$(date +"%Y%m%d%H%M%S")'",
  "card_last_4": "5678",
  "customer_name": "Budi Santoso",
  "customer_account": "1234567890",
  "customer_phone": "081234567890",
  "customer_email": "budi.santoso@example.com",
  "claim_type": "CASH_NOT_DISPENSED",
  "claim_description": "Saya melakukan penarikan tunai sebesar Rp 2.500.000 di ATM lokasi Mobil Kas Keliling. Transaksi berhasil dan saldo terpotong namun uang tidak keluar dari mesin ATM. Saya sudah menunggu beberapa saat tetapi uang tidak keluar. Mohon untuk diproses pengembalian dana saya.",
  "reporting_channel": "BRANCH"
}'

# Make the API call
RESPONSE=$(curl -s -b cookies.txt -X POST "$API_BASE_URL/api/tickets/atm-claim" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=$SESSION_TOKEN" \
  -d "$PAYLOAD")

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ ATM Claim ticket created successfully!"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
else
    echo "❌ Failed to create ATM Claim ticket"
    echo ""
    echo "Error Response:"
    echo "$RESPONSE" | python -m json.tool 2>/dev/null || echo "$RESPONSE"
fi

# Clean up
rm -f cookies.txt

echo ""
echo "========================================="
echo "Test completed"
echo "========================================="