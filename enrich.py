#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Doc data.json (tu scrape.py), gan them 'sector' (nganh) va 'group' (tap doan)
cho moi cong ty, roi xuat ra data.js dang `window.GRAPH_DATA = {...}` de web
mo truc tiep bang file:// (double-click) van chay duoc, khong can server.
"""
import json, sys

SECTORS = {
    "Ngân hàng": "VCB BID CTG VPB TCB MBB ACB HDB STB VIB TPB SHB MSB OCB EIB LPB SSB NAB ABB VBB",
    "Bất động sản": "VIC VHM VRE NVL KDH DXG PDR NLG DIG KBC BCM HDG SZC DXS CEO IJC NTL SIP SNZ TCH",
    "Tiêu dùng & Bán lẻ": "VNM MSN MWG SAB PNJ DGW FRT MCH KDC QNS VHC ANV SBT BHN VEA",
    "Công nghiệp & Vật liệu": "HPG HSG NKG GVR DGC DCM DPM BMP VGC GEX REE PC1 HT1 VCS PTB DHC BFC",
    "Năng lượng & Tiện ích": "GAS POW PLX PGV NT2 BWE TDM PVS PVD PVT BSR OIL GEG",
    "Công nghệ & Viễn thông": "FPT CMG ELC VGI FOX",
    "Hàng không, Vận tải & Cảng": "HVN VJC ACV GMD HAH VSC VTP SCS PHP",
    "Chứng khoán & Bảo hiểm": "SSI VND VCI HCM VIX SHS MBS FTS BSI BVH BMI PVI MIG",
    "Dược & Y tế": "DHG IMP DBD TNH",
    "Khác": "IDC DPR PHR",
}
# tap doan / he sinh thai (quan he co that, dat ten ro rang)
GROUPS = {
    "Tập đoàn Vingroup": "VIC VHM VRE",
    "Tập đoàn Masan": "MSN MCH",
    "Tập đoàn FPT": "FPT FRT FOX",
    "Tập đoàn Viettel": "VGI VTP",
    "Hệ sinh thái Dầu khí (PVN)": "GAS PVS PVD PVT BSR OIL PVI DCM DPM POW",
    "Tập đoàn Gelex": "GEX VGC",
}

def invert(m):
    out = {}
    for k, syms in m.items():
        for s in syms.split():
            out[s] = k
    return out

SEC = invert(SECTORS)
GRP = invert(GROUPS)

def main():
    d = json.load(open('data.json', encoding='utf-8'))
    missing = []
    for sym, c in d['companies'].items():
        c['sector'] = SEC.get(sym, 'Khác')
        if sym in GRP:
            c['group'] = GRP[sym]
        if sym not in SEC:
            missing.append(sym)
    if missing:
        print("CANH BAO: cac ma chua gan nganh ->", missing, file=sys.stderr)

    d['meta']['sectors'] = sorted(SECTORS.keys())
    d['meta']['groups'] = sorted(GROUPS.keys())

    js = "// Tu dong sinh boi enrich.py - du lieu ban lanh dao tu CafeF\n"
    js += "window.GRAPH_DATA = " + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ";\n"
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js)

    # cap nhat lai data.json (co them sector/group)
    json.dump(d, open('data.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(f"OK -> data.js ({len(js)} bytes)", file=sys.stderr)
    print(f"   {len(d['companies'])} cong ty, {len(d['people'])} nguoi", file=sys.stderr)
    # thong ke nganh
    from collections import Counter
    cc = Counter(c['sector'] for c in d['companies'].values())
    for k, v in cc.most_common():
        print(f"   {k}: {v} cty", file=sys.stderr)

if __name__ == '__main__':
    main()
