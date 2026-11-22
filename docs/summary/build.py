"""Build the laws & experiments summary (HTML + PDF via WeasyPrint).

Usage:  python3 docs/summary/build.py
Output: docs/summary/summary.html and docs/summary/summary.pdf
"""
import json
import pathlib
import re

HERE = pathlib.Path(__file__).resolve().parent
SVGS = json.loads((HERE / "circuits.json").read_text(encoding="utf-8"))

# ---------- formula helpers ----------
def fr(a, b):
    return f'<span class="fr"><span class="n">{a}</span><span class="d">{b}</span></span>'

def sq(x):
    return f'<span class="sq">√<span class="rad">{x}</span></span>'

def s(x):  # subscript
    return f"<sub>{x}</sub>"

def eq(html, note=""):
    return f'<div class="eq"><div class="m" dir="ltr">{html}</div>{f"<div class=note>{note}</div>" if note else ""}</div>'

def ltr(x):
    return f'<span class="l" dir="ltr">{x}</span>'

# ---------- circuit SVG styling (WeasyPrint reads <style> inside SVG) ----------
SVG_STYLE = """<style>
.w{fill:none;stroke:#2b3a44;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
.w.thin{stroke-width:1.5}.w.plate{stroke-width:4}.w.active,.comp.active .w{stroke:#0a6a84;stroke-width:2.6}
.redlead{stroke:#c62828}.body{fill:#ffffff}.node{fill:#2b3a44}.term{fill:#fff;stroke:#2b3a44;stroke-width:2}
.lbl{fill:#13212a;font-family:'Plex Mono';font-size:13px;font-weight:500}.lbl.sub{fill:#627580;font-size:11.5px}
.lbl.acc{fill:#0a6a84;font-weight:600}.lbl.big{font-size:15px;font-weight:600}.lbl.cop{fill:#b0602a;font-weight:600}
.mlet{fill:#13212a;font-family:'Plex Mono';font-size:15px;font-weight:700}.arrow-fill{fill:#2b3a44}.flow{display:none}
</style><defs><marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#2b3a44"/></marker></defs>"""

def circuit(key):
    svg = SVGS[key]
    i = svg.index(">") + 1
    return svg[:i] + SVG_STYLE + svg[i:]

# ---------- content ----------
EXPS = [
    dict(
        n=1, key="voltmeter", title="تصميم فولتميتر تيار مستمر", en="Designing a DC Voltmeter",
        idea="الجلفانوميتر ينحرف انحرافاً كاملاً عند 0.3 V فقط. نضع معه على التوالي مقاومة كبيرة Rs تأخذ الجهد الزائد، فيصبح فولتميتر بالمدى الذي نريده.",
        laws=[
            eq(f"I{s('g')} = {fr('V'+s('g'), 'R'+s('g'))} = {fr('0.3', '6000')} = 50 µA", "تيار الانحراف الكامل"),
            eq(f"R{s('s')} = {fr('V'+s('f'), 'I'+s('g'))} − R{s('g')}", "مقاومة التوالي لكل مدى"),
            eq(f"S = {fr('1', 'I'+s('g'))} = 20 kΩ/V", "حساسية الجهاز"),
        ],
        table=(["المدى Vf", "3 V", "6 V", "9 V", "12 V"], ["Rs", "54 kΩ", "114 kΩ", "174 kΩ", "234 kΩ"]),
        steps="وصّل الجلفانوميتر مع Rs ← سلّط جهداً متغيراً ← سجّل الجهد عند انحراف 25، 50، 75، 100% ← قارن بفولتميتر جاهز.",
        qa=[
            ("لماذا نحتاج مقاومة توالٍ؟", "الجلفانوميتر يتحمل 0.3 V فقط؛ Rs تأخذ الجهد الزائد وتحدّ التيار."),
            ("كيف حددنا Rs؟", f"بقانون أوم: {ltr('Rs = Vf/Ig − Rg')}، مثلاً 3 V ← 54 kΩ."),
            ("ماذا لو كانت Rs أصغر؟", "يمر تيار أكبر: قراءة أعلى من الحقيقية، تجاوز التدريج، وقد يتلف الملف."),
            ("أهمية المقاومة الداخلية؟", "كلما كبرت قلّ التيار المسحوب من الدائرة وقلّ خطأ التحميل."),
            ("تصميم مدى 8 V؟", ltr("Rs = 8/50µA − 6000 = 154 kΩ")),
        ],
    ),
    dict(
        n=2, key="ammeter", title="تصميم أميتر تيار مستمر", en="Multi-Range DC Ammeter",
        idea="نضع مقاومة صغيرة (شنت Rsh) على التوازي مع الجلفانوميتر فتمرر معظم التيار، ولا يمر في الملف أكثر من 50 µA.",
        laws=[
            eq(f"R{s('g')} = {fr('V'+s('g'), 'I'+s('g'))} = {fr('0.3', '50 µA')} = 6000 Ω"),
            eq(f"I = I{s('g')} + I{s('sh')}", "تقسيم التيار"),
            eq(f"R{s('sh')} = {fr('V'+s('g'), 'I − I'+s('g'))} = {fr('R'+s('g'), 'm − 1')}", "m = I / Ig"),
        ],
        table=(["المدى", "3 mA", "6 mA", "9 mA", "12 mA"], ["Rsh", "101.7 Ω", "50.42 Ω", "33.52 Ω", "25.10 Ω"]),
        steps="المجهز ← الحمل 1 kΩ ← (الجلفانوميتر ∥ الشنت) ← سجّل الانحراف الكامل لكل مدى وقارن بأميتر مرجعي.",
        qa=[
            ("كيف تُحدَّد مقاومة الجلفانوميتر؟", f"{ltr('Rg = 0.3/50µA = 6000 Ω')}، أو عملياً بطريقة نصف الانحراف."),
            ("لماذا نحتاج الشنت؟", "الملف يتحمل 50 µA فقط؛ الشنت يمرر الباقي فيتوسع المدى."),
            ("ما معادلة الشنت؟", ltr("Rsh = Vg / (I − Ig)")),
            ("مصادر الخطأ؟", "سماحية الشنت، مقاومة التلامس والأسلاك، الحرارة، مقاومة الأميتر نفسه، قراءة المؤشر."),
        ],
    ),
    dict(
        n=3, key="wheatstone", title="قنطرة ويتستون", en="Wheatstone DC Bridge",
        idea="مقسّما جهد على التوازي. نغيّر Rv حتى يتساوى جهد D و B فيقرأ الفولتميتر صفراً (اتزان). في عدم الاتزان نحسب المجهولة من قراءة Vo.",
        laws=[
            eq(f"{fr('R'+s('3'), 'R'+s('u'))} = {fr('R'+s('2'), 'R'+s('v'))} &nbsp;⟹&nbsp; R{s('u')} = {fr('R'+s('3')+' R'+s('v'), 'R'+s('2'))}", "شرط الاتزان"),
            eq(f"V{s('o')} = V ( {fr('R'+s('x'), 'R'+s('x')+' + R'+s('3'))} − {fr('R'+s('1'), 'R'+s('1')+' + R'+s('2'))} )", "عدم الاتزان"),
            eq(f"k = {fr('V'+s('o'), 'V')} + {fr('R'+s('1'), 'R'+s('1')+'+R'+s('2'))} , &nbsp; R{s('x')} = {fr('k R'+s('3'), '1 − k')} , &nbsp; R{s('u')} = R{s('x')} − R{s('4')}"),
        ],
        table=(["المقاومة", "< 1 Ω", "1 Ω – 100 kΩ", "> 100 kΩ"], ["الطريقة", "قنطرة كلفن", "ويتستون / أوميتر", "الميغر"]),
        steps="المجهز بين A و C ← صندوق المقاومات في ذراع Rv ← الفولتميتر بين D و B ← غيّر Rv حتى الصفر وسجّل.",
        qa=[
            ("مبدأ القنطرة؟", "مقارنة صفرية: نغيّر Rv حتى ينعدم فرق الجهد بين D و B."),
            ("شرط الاتزان؟", ltr("Ru · R2 = R3 · Rv")),
            ("تحسين الدقة؟", "مقاومات دقيقة، كاشف حساس، نسبة أذرع مناسبة، أسلاك قصيرة، تكرار القياس."),
            ("هل تعمل مع AC؟", f"نعم بممانعات وكاشف متناوب: {ltr('Z1·Z4 = Z2·Z3')}."),
            ("لماذا لا تناسب المقاومات الصغيرة؟", "مقاومة الأسلاك والتلامس بحجم المقاسة؛ نستخدم قنطرة كلفن."),
            ("قياس عزل كابل؟", "بالميغر (Megger)."),
            ("تدريج الأوميتر معكوس وغير خطي؟", f"{ltr('I = E/(Rint + Rx)')}: أكبر تيار عند الصفر (يمين)، والعلاقة عكسية."),
        ],
    ),
    dict(
        n=4, key="potentiometer", title="مجزئ الجهد بالفولتميتر التناظري والرقمي", en="Rotary Potentiometer",
        idea="الجهد بين الذراع W والطرف A يزداد مع الدوران. الفولتميتر يسحب تياراً فيخفض القراءة (تأثير التحميل)، والتناظري يتأثر أكثر من الرقمي.",
        laws=[
            eq(f"R{s('AW')} = x · R{s('T')} , &nbsp; V{s('out')} = x · V{s('s')}", "القيمة النظرية (x من 0 إلى 1)"),
            eq(f"V{s('out')} = x V{s('s')} · {fr('R'+s('m'), 'R'+s('m')+' + x(1−x) R'+s('T'))}", "مع التحميل"),
            eq(f"R{s('m')} (تناظري) = S × المدى &nbsp;,&nbsp; R{s('m')} (رقمي) ≈ 10 MΩ"),
        ],
        table=(["الموضع", "0%", "25%", "50%", "75%", "100%"], ["الزاوية", "0°", "68°", "135°", "203°", "270°"]),
        steps="قِس RT و RAW بالأوميتر والمجهز مفصول ← وصّل 5 V بين B و A ← اقرأ بالتناظري ثم بالرقمي ← ارسم Vout مقابل x.",
        qa=[
            ("لماذا اختلف الجهازان؟", "التحميل: مقاومة التناظري قريبة من مقاومة المجزئ، والرقمي 10 MΩ."),
            ("أين الفرق أكبر؟", "المطلق عند 75%، والنسبي عند 50%، ولا فرق عند 0% و100%."),
            ("خطي أم لوغاريتمي؟", "خطي: القراءات بخطوات متساوية على خط مستقيم."),
            ("الدقة والضبط والتمييز؟", "قرب القراءة من الحقيقة، تقارب القراءات المتكررة، أصغر تغيّر يظهر. الرقمي أفضل."),
            ("ميزتا التناظري؟", "يُظهر اتجاه التغيّر باستمرار، ولا يحتاج بطارية لقياس الجهد."),
        ],
    ),
    dict(
        n=5, key="inductance", title="قياس المحاثة", en="Inductive Measurement",
        idea="نغيّر R حتى يتساوى الجهد عليها مع الجهد على الملف. التيار واحد، فتتساوى ممانعة الملف مع R، ومنها نحسب L.",
        laws=[
            eq(f"X{s('L')} = 2πfL", "الرادة الحثية"),
            eq(f"V{s('R')} = V{s('L')} &nbsp;⟹&nbsp; R = {sq('r² + X'+s('L')+'²')}"),
            eq(f"L = {fr(sq('R² − r²'), '2πf')}", "r مقاومة سلك الملف"),
        ],
        table=(["المعطى", "f", "r", "R عند التساوي"], ["القيمة", "1000 Hz", "بالأوميتر", "من صندوق المقاومات"]),
        steps="قِس r بالأوميتر ← المولّد 1 kHz ← الملف على التوالي مع R ← غيّر R حتى VR = VL ← احسب L.",
        qa=[
            ("لماذا يتساوى VR و VL؟", f"لأن المعادلة مبنية على {ltr('R = |ZL|')}."),
            ("أثر التردد في XL؟", f"{ltr('XL = 2πfL')}: تزداد طردياً."),
            ("لو صار التردد 2000 Hz؟", "تتضاعف XL ونحتاج R أكبر، لكن L المحسوبة لا تتغير."),
            ("مصادر الخطأ؟", "دقة r، دقة الفولتميتر عند 1 kHz، تشوّه الموجة، صعوبة ضبط التساوي."),
        ],
    ),
    dict(
        n=6, key="capacitance", title="قياس السعة", en="Capacitance Measurement",
        idea="الطريقة نفسها مع متسعة بدل الملف: التيار واحد في R و C، فنحسب C من نسبة الجهدين.",
        laws=[
            eq(f"X{s('C')} = {fr('1', '2πfC')}", "الرادة السعوية"),
            eq(f"C = {fr('V'+s('R'), '2πf · R · V'+s('C'))}"),
            eq(f"V{s('R')} = V{s('C')} &nbsp;⟹&nbsp; C = {fr('1', '2πfR')}"),
        ],
        table=(["المعطى", "f", "R", "VR , VC"], ["القيمة", "1000 Hz", "متغيرة", "بالفولتميتر"]),
        steps="صِل R و C على التوالي ← المولّد 1 kHz ← قِس VR و VC ← غيّر R حتى التساوي ← احسب C.",
        qa=[
            ("لماذا يتساوى الجهدان؟", f"نضبط R حتى {ltr('R = XC')} فتصبح {ltr('C = 1/2πfR')}."),
            ("أثر التردد؟", "XC تقل بزيادة التردد فنحتاج R أصغر، و C لا تتغير."),
            ("قياس المحاثة بها؟", f"نضع الملف بدل المتسعة: {ltr('L = √(R² − r²)/2πf')}."),
        ],
    ),
    dict(
        n=7, key="lvdt", title="المحوّل التفاضلي LVDT", en="Linear Variable Differential Transformer",
        idea="ملف ابتدائي في الوسط وملفان ثانويان على جانبيه وقلب حديدي متحرك. حركة القلب تزيد جهد أحد الثانويين وتنقص الآخر، والإثارة متناوبة 338 Hz.",
        laws=[
            eq(f"V{s('o')} = V{s('S2')} − V{s('S1')}", "الثانويان على التوالي بتعاكس"),
            eq("|V<sub>o</sub>| ∝ x &nbsp;,&nbsp; الطور = الاتجاه (180° عند الصفر)"),
            eq(f"الحساسية = {fr('ΔV'+s('o'), 'Δx')} &nbsp; (V/mm)"),
        ],
        table=(["الإعداد", "Vp", "f", "الإزاحات"], ["القيمة", "10 V (VR5)", "338 Hz", "±1، ±2، ±3 mm"]),
        steps="شغّل وحدة KL-620 ← اضبط Vp = 10 V ← حرّك البرغي حتى Vo30-1 = Vo30-2 (الصفر) ← سجّل عند الإزاحات ← ارسم.",
        qa=[
            ("أهمية موضع الصفر؟", "القلب في المنتصف و VS1 = VS2؛ مرجع القياس وأكثر المناطق خطية."),
            ("تحريك القلب يميناً أو يساراً؟", "نحو S2 يزداد V2، ونحو S1 يزداد V1، وينقلب الطور 180°."),
            ("لماذا AC لا DC؟", "الحث المتبادل يحتاج فيضاً متغيراً؛ المستمر لا يحتث جهداً."),
            ("لماذا اللاخطية بعيداً عن الصفر؟", "يخرج طرف القلب من منطقة الملفات فيتشبّع الربط ويقل الميل."),
        ],
    ),
]

SUMMARY = [
    ("فولتميتر", f"Rs = Vf/Ig − Rg", "Ig = Vg/Rg = 50 µA"),
    ("أميتر", "Rsh = Vg/(I − Ig)", "I = Ig + Ish"),
    ("ويتستون (اتزان)", "Ru = R3·Rv/R2", "VD = VB"),
    ("ويتستون (عدم اتزان)", "Vo = V[Rx/(Rx+R3) − R1/(R1+R2)]", "Ru = Rx − R4"),
    ("مجزئ الجهد", "Vout = x·Vs", "× Rm/(Rm + x(1−x)RT)"),
    ("المحاثة", "L = √(R² − r²)/2πf", "XL = 2πfL"),
    ("السعة", "C = VR/(2πf·R·VC)", "XC = 1/2πfC"),
    ("LVDT", "Vo = VS2 − VS1", "S = ΔVo/Δx"),
]

# ---------- page assembly ----------
def exp_page(e):
    head, row = e["table"]
    iso = lambda c: f'<span dir="ltr" style="unicode-bidi:isolate">{c}</span>' if re.search(r"[0-9A-Za-zΩ°±]", c) and not re.search(r"[\u0600-\u06FF]", c) else c
    table = "<table class='kv'><tr>" + "".join(f"<th>{iso(h)}</th>" for h in head) + "</tr><tr>" + "".join(f"<td>{iso(c)}</td>" for c in row) + "</tr></table>"
    qa = "".join(f"<div class='q'><span class='qn'>{i + 1}</span><div><b>{q}</b><p>{a}</p></div></div>" for i, (q, a) in enumerate(e["qa"]))
    return f"""
<section class="exp">
  <header class="band">
    <div class="num">{e['n']:02d}</div>
    <div><h2>{e['title']}</h2><div class="en">{e['en']}</div></div>
  </header>
  <p class="idea">{e['idea']}</p>
  <div class="grid">
    <div class="laws"><h3>القوانين</h3>{''.join(e['laws'])}</div>
    <figure class="circ">{circuit(e['key'])}<figcaption>مخطط الدائرة</figcaption></figure>
  </div>
  {table}
  <div class="steps"><b>الخطوات:</b> {e['steps']}</div>
  <h3>أسئلة المناقشة</h3>
  <div class="qa">{qa}</div>
</section>"""

def build_html():
    toc = "".join(f"<li><span class='tn'>{e['n']:02d}</span><span class='tt'>{e['title']}</span><span class='te'>{e['en']}</span></li>" for e in EXPS)
    summary = "".join(f"<tr><td class='sn'>{a}</td><td dir='ltr' class='sf'>{b}</td><td dir='ltr' class='sx'>{c}</td></tr>" for a, b, c in SUMMARY)
    css = (HERE / "summary.css").read_text(encoding="utf-8")
    return f"""<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ملخص قوانين مختبر القياسات</title><style>{css}</style></head>
<body>
<section class="cover">
  <div class="eyebrow">Electrical Measurements Lab</div>
  <h1>مختبر القياسات الكهربائية</h1>
  <p class="sub">ملخص القوانين والتجارب والدوائر وأجوبة المناقشة</p>
  <ol class="toc">{toc}</ol>
  <div class="cover-meter"><svg viewBox="0 0 300 150" width="300" height="150"><path d="M30 140 A120 120 0 0 1 270 140" fill="none" stroke="#9fd3df" stroke-width="3"/>
  {''.join(f'<line x1="{150 + 120 * __import__("math").sin(__import__("math").radians(a)):.1f}" y1="{140 - 120 * __import__("math").cos(__import__("math").radians(a)):.1f}" x2="{150 + (108 if a % 20 == 0 else 113) * __import__("math").sin(__import__("math").radians(a)):.1f}" y2="{140 - (108 if a % 20 == 0 else 113) * __import__("math").cos(__import__("math").radians(a)):.1f}" stroke="#9fd3df" stroke-width="2"/>' for a in range(-80, 81, 10))}
  <line x1="150" y1="140" x2="214" y2="44" stroke="#ff6b5b" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="140" r="7" fill="#e8f3f5"/></svg></div>
</section>
{''.join(exp_page(e) for e in EXPS)}
<section class="final">
  <header class="band"><div class="num">∑</div><div><h2>ملخص القوانين</h2><div class="en">Formula sheet</div></div></header>
  <table class="sum"><tr><th>التجربة</th><th>القانون الرئيسي</th><th>قانون مساعد</th></tr>{summary}</table>
  <h3>ثوابت الجلفانوميتر</h3>
  <div class="chips"><span dir="ltr">Vg = 0.3 V</span><span dir="ltr">Ig = 50 µA</span><span dir="ltr">Rg = 6000 Ω</span><span dir="ltr">S = 20 kΩ/V</span></div>
  <h3>قواعد سريعة</h3>
  <ul class="rules">
    <li>الفولتميتر يوصل <b>على التوازي</b> ومقاومته كبيرة، والأميتر يوصل <b>على التوالي</b> ومقاومته صغيرة.</li>
    <li>المقاومة تُقاس <b>والمصدر مفصول</b>.</li>
    <li>في دوائر AC الجهود طورية: <span dir="ltr">VR + VX ≠ Vs</span>.</li>
    <li>الرادة الحثية تزداد مع التردد، والسعوية تقل معه.</li>
  </ul>
</section>
</body></html>"""

if __name__ == "__main__":
    html = build_html()
    (HERE / "summary.html").write_text(html, encoding="utf-8")
    from weasyprint import HTML
    HTML(string=html, base_url=str(HERE)).write_pdf(HERE / "summary.pdf")
    print("wrote", HERE / "summary.pdf")
