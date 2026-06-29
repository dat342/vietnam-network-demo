#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scrape ban lanh dao (HDQT/Ban giam doc/BKS) cua cac doanh nghiep niem yet lon nhat VN
tu CafeF, roi xay graph quan he: 2 nguoi "quen nhau" neu cung ngoi trong ban lanh dao
mot cong ty (interlocking directorate). Xuat ra data.json cho web demo.

Nguon: https://cafef.vn/du-lieu/Ajax/PageNew/ListCeo.ashx?Symbol=<ma>&PositionGroup=0
"""
import urllib.request, urllib.error, ssl, json, time, re, sys

CTX = ssl.create_default_context(); CTX.check_hostname=False; CTX.verify_mode=ssl.CERT_NONE
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    'Referer': 'https://s.cafef.vn/',
    'X-Requested-With': 'XMLHttpRequest',
}

# ~110 ma co phieu von hoa lon nhat san VN (VN30 + large/mid cap nhieu nganh)
SYMBOLS = [
    # Ngan hang
    "VCB","BID","CTG","VPB","TCB","MBB","ACB","HDB","STB","VIB","TPB","SHB","MSB",
    "OCB","EIB","LPB","SSB","NAB","ABB","VBB",
    # Bat dong san
    "VIC","VHM","VRE","NVL","KDH","DXG","PDR","NLG","DIG","KBC","BCM","HDG","SZC",
    "DXS","CEO","IJC","NTL","SIP","SNZ","TCH",
    # Tieu dung - ban le
    "VNM","MSN","MWG","SAB","PNJ","DGW","FRT","MCH","KDC","QNS","VHC","ANV","SBT",
    "BHN","VEA",
    # Cong nghiep - vat lieu
    "HPG","HSG","NKG","GVR","DGC","DCM","DPM","BMP","VGC","GEX","REE","PC1","HT1",
    "VCS","PTB","DHC","BFC",
    # Nang luong - tien ich
    "GAS","POW","PLX","PGV","NT2","BWE","TDM","PVS","PVD","PVT","BSR","OIL","GEG",
    # Cong nghe - vien thong
    "FPT","CMG","ELC","VGI","FOX",
    # Hang khong - van tai - cang
    "HVN","VJC","ACV","GMD","HAH","VSC","VTP","SCS","PHP",
    # Chung khoan - bao hiem
    "SSI","VND","VCI","HCM","VIX","SHS","MBS","FTS","BSI","BVH","BMI","PVI","MIG",
    # Duoc - y te
    "DHG","IMP","DBD","TNH",
    # Khac
    "IDC","VEA","DPR","PHR","BWE","HSG",
]
# bo trung lap, giu thu tu
seen=set(); SYMBOLS=[s for s in SYMBOLS if not (s in seen or seen.add(s))]

def clean_name(raw):
    n = raw.strip()
    n = re.sub(r'^(Ông|Bà|Ong|Ba)\s+', '', n)   # bo tien to gioi tinh khi hien thi
    return n.strip()

def fetch_leaders(symbol):
    url = f"https://cafef.vn/du-lieu/Ajax/PageNew/ListCeo.ashx?Symbol={symbol.lower()}&PositionGroup=0"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, context=CTX, timeout=25) as r:
        data = json.loads(r.read().decode('utf-8', errors='ignore'))
    if not data.get('Success') or not data.get('Data'):
        return None
    out = []
    for group in data['Data']:
        gname = group.get('GroupName', '')
        for p in group.get('values', []):
            code = p.get('CeoCode')
            if not code:
                continue
            out.append({
                'code': code,
                'name': clean_name(p.get('Name', '')),
                'raw_name': p.get('Name', '').strip(),
                'position': p.get('Position', '').strip(),
                'group': gname,
                'image': (p.get('Image') or '').strip(),
            })
    return out

def main():
    people = {}     # code -> {name, positions:{symbol:position}, companies:set}
    companies = {}  # symbol -> {members:set(code)}
    ok, fail = [], []

    for i, sym in enumerate(SYMBOLS, 1):
        try:
            leaders = fetch_leaders(sym)
        except Exception as e:
            print(f"[{i:>3}/{len(SYMBOLS)}] {sym:5} ERR {type(e).__name__}", file=sys.stderr)
            fail.append(sym); time.sleep(0.4); continue
        if not leaders:
            print(f"[{i:>3}/{len(SYMBOLS)}] {sym:5} (khong co du lieu)", file=sys.stderr)
            fail.append(sym); time.sleep(0.4); continue

        companies.setdefault(sym, {'members': set()})
        for L in leaders:
            c = L['code']
            companies[sym]['members'].add(c)
            pr = people.setdefault(c, {'name': L['name'], 'positions': {}, 'companies': set(), 'image': ''})
            pr['companies'].add(sym)
            # giu chuc vu (uu tien dong dau tien gap o moi cong ty)
            pr['positions'].setdefault(sym, L['position'])
            if L.get('image') and not pr['image']:  # luu anh dau tien co
                pr['image'] = L['image']
            if len(L['name']) > len(pr['name']):  # ten day du hon
                pr['name'] = L['name']
        print(f"[{i:>3}/{len(SYMBOLS)}] {sym:5} OK  {len(leaders)} nguoi", file=sys.stderr)
        ok.append(sym)
        time.sleep(0.35)   # lich su voi server

    # chuyen set -> list de serialize
    people_out = {c: {
        'name': v['name'],
        'companies': sorted(v['companies']),
        'positions': v['positions'],
        'image': v.get('image', ''),
    } for c, v in people.items()}
    companies_out = {s: {'members': sorted(v['members'])} for s, v in companies.items()}

    # nguoi ngoi >=2 HDQT = cau noi
    bridges = sorted(
        [(c, v) for c, v in people_out.items() if len(v['companies']) >= 2],
        key=lambda kv: -len(kv[1]['companies'])
    )

    result = {
        'meta': {
            'source': 'CafeF - ListCeo.ashx',
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'companies_ok': len(ok),
            'companies_fail': len(fail),
            'failed_symbols': fail,
            'total_people': len(people_out),
            'total_bridges': len(bridges),
        },
        'people': people_out,
        'companies': companies_out,
    }
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    print("\n===== TONG KET =====", file=sys.stderr)
    print(f"Cong ty thanh cong: {len(ok)} | that bai: {len(fail)}", file=sys.stderr)
    print(f"Tong so nguoi: {len(people_out)}", file=sys.stderr)
    print(f"Nguoi ngoi >=2 HDQT (cau noi): {len(bridges)}", file=sys.stderr)
    for c, v in bridges[:15]:
        print(f"   {v['name']:28} -> {len(v['companies'])} cty: {', '.join(v['companies'])}", file=sys.stderr)

if __name__ == '__main__':
    main()
