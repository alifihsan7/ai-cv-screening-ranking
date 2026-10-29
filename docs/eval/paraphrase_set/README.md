# Paraphrase stress set

The 15 core CVs of the golden dataset with the wording of 31 bullets rewritten. Facts, skills, dates, and layout are unchanged, so the golden labels apply as they are. The rewrites avoid the vocabulary the keyword rules rely on, which makes this a recall stress test for the verifier, not a sample of real CVs.

Rebuild the CV files (PDF and DOCX are git-ignored) with `python scripts/build_paraphrase_set.py`, then measure with `python scripts/eval_agent_path.py --cvs-dir docs/eval/paraphrase_set/cvs/core --labels docs/eval/paraphrase_set/labels/expected_JD-01.json --output-json out.json`.

## Rewrites

| Original | Paraphrase |
|---|---|
| Memimpin tim 4 backend engineer, termasuk code review dan mentoring engineer junior. | Mengarahkan 4 backend engineer, termasuk code review dan pendampingan teknis bagi engineer junior. |
| Mendesain arsitektur microservices berbasis Python (FastAPI) untuk sistem pelacakan paket. | Merancang arsitektur microservices berbasis Python (FastAPI) untuk sistem pelacakan paket. |
| Menurunkan latensi p95 API tracking dari 900 ms menjadi 180 ms dengan optimasi query PostgreSQL dan caching Redis. | Menurunkan latensi p95 API tracking dari 0,9 s menjadi 0,18 s dengan optimasi query PostgreSQL dan caching Redis. |
| Membangun REST API pembayaran dengan Python (Django REST Framework) dan PostgreSQL. | Mengimplementasikan REST API pembayaran dengan Python (Django REST Framework) dan PostgreSQL. |
| Menangani lebih dari 1,2 juta transaksi per hari dengan uptime 99,9%. | Menangani lebih dari 1,2 jt transaksi per hari dengan uptime 99,9 persen. |
| Membuat API inventori untuk 3 toko UMKM dengan Flask. | Menciptakan API inventori untuk 3 toko UMKM dengan Flask. |
| Built and maintained REST APIs in Python (FastAPI) serving 300k monthly active users. | Engineered and maintained REST APIs in Python (FastAPI) serving 300 thousand monthly active users. |
| Designed PostgreSQL schemas and reduced slow queries by 60% through indexing and query rewrites. | Architected PostgreSQL schemas and reduced slow queries by 60 percent through indexing and query rewrites. |
| Developed Django REST Framework endpoints for client projects. | Implemented Django REST Framework endpoints for client projects. |
| Developed REST APIs with Python (Flask) for the inventory module used by 40 retail stores in production. | Implemented REST APIs with Python (Flask) for the inventory module used by 40 retail stores in production. |
| Built with Flask and Redis, packaged with Docker; handled 10k requests/day in a load test. | Implemented with Flask and Redis, packaged with Docker; handled 10 thousand requests per day in a load test. |
| Mentored 5 backend engineers and ran weekly design reviews. | Coached 5 backend engineers and ran weekly design reviews. |
| Cut infrastructure cost by 35% by right-sizing clusters and caching. | Cut infrastructure cost by 35 percent by right-sizing clusters and caching. |
| Built Python (FastAPI) services backed by PostgreSQL. | Implemented Python (FastAPI) services backed by PostgreSQL. |
| Exposed REST APIs for 20+ courier partners. | Exposed REST APIs for more than 20 courier partners. |
| Membangun microservices reservasi klinik dengan Python (Django) dan PostgreSQL. | Merealisasikan microservices reservasi klinik dengan Python (Django) dan PostgreSQL. |
| Mengembangkan backend aplikasi web klien dengan Python (Flask) dan PHP. | Mengimplementasikan backend aplikasi web klien dengan Python (Flask) dan PHP. |
| Sistem antrian berbasis web yang dipakai 3 puskesmas dan memangkas waktu tunggu rata-rata 25%. | Sistem antrian berbasis web yang dipakai 3 puskesmas dan memangkas waktu tunggu rata-rata 25 persen. |
| Memimpin 30 pengurus himpunan. | Mengarahkan 30 pengurus himpunan. |
| Built REST APIs with Node.js (Express) and PostgreSQL for the ordering platform. | Engineered REST APIs with Node.js (Express) and PostgreSQL for the ordering platform. |
| Improved checkout API response time by 40% by adding database indexes. | Improved checkout API response time by 40 percent by adding database indexes. |
| Membuat API internal sederhana dengan Flask untuk menyuplai data dashboard. | Menciptakan API internal sederhana dengan Flask untuk menyuplai data dashboard. |
| Mempercepat pembuatan laporan mingguan dari 2 hari menjadi 2 jam. | Mempercepat pembuatan laporan mingguan dari dua hari menjadi dua jam. |
| Membuat endpoint REST API dengan Python (FastAPI) untuk modul absensi. | Menciptakan endpoint REST API dengan Python (FastAPI) untuk modul absensi. |
| Built API test automation with Python (pytest, requests) covering 120+ REST endpoints. | Engineered API test automation with Python (pytest, requests) covering more than 120 REST endpoints. |
| Led a QA team of 3 engineers. | Directed a QA group of 3 engineers. |
| Reduced regression testing time from 3 days to 4 hours. | Reduced regression testing time from three days to four hours. |
| Membangun REST API dengan Laravel (PHP) dan MySQL. | Merealisasikan REST API dengan Laravel (PHP) dan MySQL. |
| Meningkatkan kecepatan muat halaman katalog sebesar 50%. | Meningkatkan kecepatan muat halaman katalog sebesar 50 persen. |
| Memimpin 6 sales executive untuk wilayah Jawa Timur. | Mengarahkan 6 sales executive untuk wilayah Jawa Timur. |
| Mencapai 120% target penjualan tahunan pada 2024. | Mencapai 120 persen dari target penjualan tahunan pada 2024. |
