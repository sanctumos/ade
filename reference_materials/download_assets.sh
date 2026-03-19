#!/bin/bash
# Download Letta ADE frontend assets from app.letta.com (writes under reference_materials/)
set -e
cd "$(dirname "$0")"
BASE="https://app.letta.com"
CDN="https://web-cdn.letta.com"

mkdir -p _next/static/css _next/static/chunks/app _next/static/chunks seo

# CSS files
for f in fecb0f1c641651e2 859831d700c0b235 7fdf90456781b457 1b2fc3693adcd791 bf685cf6886ad8e0 e6d439ce9b6012db; do
  wget -q -O "_next/static/css/${f}.css" "${CDN}/_next/static/css/${f}.css" || true
done

# JS chunks - webpack, polyfills, main
wget -q -O "_next/static/chunks/webpack-233af02ae087efea.js" "${CDN}/_next/static/chunks/webpack-233af02ae087efea.js" || true
wget -q -O "_next/static/chunks/polyfills-42372ed130431b0a.js" "${CDN}/_next/static/chunks/polyfills-42372ed130431b0a.js" || true
wget -q -O "_next/static/chunks/main-app-c030cdddf658f77f.js" "${CDN}/_next/static/chunks/main-app-c030cdddf658f77f.js" || true

# JS chunks - numbered
for name in "59c6eb5a-f0561cb09e4a521a" "87c73c54-8f4f1974f7c2937b" "5598-ad8767643715366c" "891cff7f-5c65ddc7f1772b0a" "47bf8baf-77d8b96e8202e2b9" "25c8a87d-926be215ce374f54" "8bb4d8db-8c19c4acb56b2544" "3143-f6b6d34ac90b4414" "6112-f326aa883002e153" "8284-2e30b6517a883c28" "9034-5b3273abc2f92ad3" "2441-af2c0328ee823ecb" "2205-df96c05cf90ec905" "4481-06e25b813c472a6a" "8252-c82bfd9d115d9cca" "3304-f41707817a8358df" "cd24890f-4426292ef57d15fb" "2600-704fa31bc33c86e8" "9152-c15d5ce53da692ea" "4287-2893f37a9085e75c" "ab6c8a12-dfa39d39eeb25250" "6b3bb038-274ca5ebec5c87a6" "6067-bd614cf55cae4b07" "6314-5e6f7e3f93c77681" "3345-4f3bc28f457e8f04" "4562-c5510d23095384be" "547-2beb5b0951f81580" "5526-156b5eff3736d541"; do
  wget -q -O "_next/static/chunks/${name}.js" "${CDN}/_next/static/chunks/${name}.js" || true
done

# App chunks
mkdir -p "_next/static/chunks/app/(logged-in-no-org-check)/(dashboard-like)"
mkdir -p "_next/static/chunks/app/(logged-out)/login"
wget -q -O "_next/static/chunks/app/(logged-in-no-org-check)/(dashboard-like)/layout-2d4992a1d6cb8036.js" "${CDN}/_next/static/chunks/app/(logged-in-no-org-check)/(dashboard-like)/layout-2d4992a1d6cb8036.js" || true
wget -q -O "_next/static/chunks/app/(logged-out)/login/page-32cf6d786b3598f4.js" "${CDN}/_next/static/chunks/app/(logged-out)/login/page-32cf6d786b3598f4.js" || true
wget -q -O "_next/static/chunks/app/global-error-12cdf335361ad40f.js" "${CDN}/_next/static/chunks/app/global-error-12cdf335361ad40f.js" || true
wget -q -O "_next/static/chunks/app/layout-8200caf117039619.js" "${CDN}/_next/static/chunks/app/layout-8200caf117039619.js" || true

# SEO assets from app.letta.com
wget -q -O "seo/favicon-96x96.png" "${BASE}/seo/favicon-96x96.png" || true
wget -q -O "seo/favicon.svg" "${BASE}/seo/favicon.svg" || true
wget -q -O "seo/favicon.ico" "${BASE}/seo/favicon.ico" || true
wget -q -O "seo/apple-touch-icon.png" "${BASE}/seo/apple-touch-icon.png" || true
wget -q -O "seo/site.webmanifest" "${BASE}/seo/site.webmanifest" || true
wget -q -O "seo/og-image.jpg" "${BASE}/seo/og-image.jpg" || true

echo "Download complete"
