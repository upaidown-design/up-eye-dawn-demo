#!/usr/bin/env python3
"""Generate INSECE Cloud Professional PDF Manual."""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    PageBreak, KeepTogether, Flowable, Frame, PageTemplate, BaseDocTemplate
)
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

# ── Brand Colors ──
GREEN = HexColor("#2ECC71")
DARK_GREEN = HexColor("#27AE60")
DARK_BLUE = HexColor("#1B4F72")
LIGHT_BLUE = HexColor("#2980B9")
VERY_LIGHT_GREEN = HexColor("#E8F8F5")
VERY_LIGHT_BLUE = HexColor("#EBF5FB")
LIGHT_GRAY = HexColor("#F2F4F4")
MEDIUM_GRAY = HexColor("#95A5A6")
DARK_GRAY = HexColor("#2C3E50")
ACCENT_ORANGE = HexColor("#E67E22")
ACCENT_RED = HexColor("#E74C3C")

# ── Paths ──
BASE = "/Users/chris/Desktop/insece"
LOGO = f"{BASE}/insece-dashboard/public/img/logo-insece-full.png"
LOGIN_IMG = f"{BASE}/docs/assets/manual/01-login.png"
DASHBOARD_IMG = f"{BASE}/backend_cloud/dashboard/public/img/demo_dashboard.png"
NDVI_IMG = f"{BASE}/backend_cloud/dashboard/public/img/demo_ndvi.png"
SCADA_IMG = f"{BASE}/backend_cloud/dashboard/public/img/scada_plc_diagram.png"
FARM_IMG = f"{BASE}/backend_cloud/dashboard/public/img/agricultural_farm_aerial.png"
OUTPUT = f"{BASE}/docs/MANUAL_INSECE_CLOUD_2026.pdf"

PAGE_W, PAGE_H = A4


# ── Custom Flowables ──

class ColorBar(Flowable):
    """A colored horizontal bar."""
    def __init__(self, width, height, color):
        Flowable.__init__(self)
        self.width = width
        self.bar_height = height
        self.color = color

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.roundRect(0, 0, self.width, self.bar_height, 2, fill=1, stroke=0)


class GradientBar(Flowable):
    """A gradient horizontal bar from color1 to color2."""
    def __init__(self, width, height, color1, color2):
        Flowable.__init__(self)
        self.width = width
        self.bar_height = height
        self.color1 = color1
        self.color2 = color2

    def draw(self):
        steps = 100
        step_w = self.width / steps
        r1, g1, b1 = self.color1.red, self.color1.green, self.color1.blue
        r2, g2, b2 = self.color2.red, self.color2.green, self.color2.blue
        for i in range(steps):
            t = i / steps
            r = r1 + (r2 - r1) * t
            g = g1 + (g2 - g1) * t
            b = b1 + (b2 - b1) * t
            self.canv.setFillColor(Color(r, g, b))
            self.canv.rect(i * step_w, 0, step_w + 1, self.bar_height, fill=1, stroke=0)


class InfoBox(Flowable):
    """A styled info/callout box."""
    def __init__(self, text, width, icon_type="info", style=None):
        Flowable.__init__(self)
        self.text = text
        self.box_width = width
        self.icon_type = icon_type
        self.style = style
        if icon_type == "warning":
            self.bg_color = HexColor("#FFF3CD")
            self.border_color = ACCENT_ORANGE
            self.icon_text = "!"
        elif icon_type == "danger":
            self.bg_color = HexColor("#F8D7DA")
            self.border_color = ACCENT_RED
            self.icon_text = "X"
        else:
            self.bg_color = VERY_LIGHT_BLUE
            self.border_color = LIGHT_BLUE
            self.icon_text = "i"
        p = Paragraph(self.text, self.style or ParagraphStyle("info", fontSize=9, leading=12))
        _, self.text_height = p.wrap(self.box_width - 30, 1000)
        self.box_height = max(self.text_height + 16, 30)

    def wrap(self, availWidth, availHeight):
        return self.box_width, self.box_height + 4

    def draw(self):
        self.canv.setFillColor(self.bg_color)
        self.canv.setStrokeColor(self.border_color)
        self.canv.setLineWidth(1.5)
        self.canv.roundRect(0, 0, self.box_width, self.box_height, 4, fill=1, stroke=1)
        self.canv.setFillColor(self.border_color)
        self.canv.circle(14, self.box_height - 14, 8, fill=1, stroke=0)
        self.canv.setFillColor(white)
        self.canv.setFont("Helvetica-Bold", 10)
        self.canv.drawCentredString(14, self.box_height - 17.5, self.icon_text)
        p = Paragraph(self.text, self.style or ParagraphStyle("info", fontSize=9, leading=12))
        p.wrap(self.box_width - 36, 1000)
        p.drawOn(self.canv, 28, self.box_height - self.text_height - 8)


class ChapterTitle(Flowable):
    """A chapter title with number badge and colored bar."""
    def __init__(self, number, title, width):
        Flowable.__init__(self)
        self.number = number
        self.title = title
        self.flowable_width = width

    def wrap(self, availWidth, availHeight):
        return self.flowable_width, 42

    def draw(self):
        self.canv.setFillColor(DARK_BLUE)
        self.canv.roundRect(0, 0, self.flowable_width, 38, 4, fill=1, stroke=0)
        self.canv.setFillColor(GREEN)
        self.canv.roundRect(0, 0, 44, 38, 4, fill=1, stroke=0)
        self.canv.rect(40, 0, 4, 38, fill=1, stroke=0)
        self.canv.setFillColor(white)
        self.canv.setFont("Helvetica-Bold", 20)
        self.canv.drawCentredString(22, 10, str(self.number))
        self.canv.setFont("Helvetica-Bold", 15)
        self.canv.drawString(54, 12, self.title)


class SectionTitle(Flowable):
    """A section title with left accent bar."""
    def __init__(self, title, width):
        Flowable.__init__(self)
        self.title = title
        self.flowable_width = width

    def wrap(self, availWidth, availHeight):
        return self.flowable_width, 24

    def draw(self):
        self.canv.setFillColor(GREEN)
        self.canv.roundRect(0, 2, 4, 18, 1, fill=1, stroke=0)
        self.canv.setFillColor(DARK_BLUE)
        self.canv.setFont("Helvetica-Bold", 12)
        self.canv.drawString(12, 5, self.title)


# ── Styles ──
def get_styles():
    styles = {}
    styles["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10, leading=14,
        alignment=TA_JUSTIFY, textColor=DARK_GRAY, spaceAfter=6
    )
    styles["body_bold"] = ParagraphStyle(
        "body_bold", parent=styles["body"], fontName="Helvetica-Bold"
    )
    styles["bullet"] = ParagraphStyle(
        "bullet", parent=styles["body"], leftIndent=18, bulletIndent=6,
        spaceBefore=2, spaceAfter=2
    )
    styles["step"] = ParagraphStyle(
        "step", fontName="Helvetica", fontSize=10, leading=14,
        alignment=TA_LEFT, textColor=DARK_GRAY, leftIndent=24, spaceBefore=4, spaceAfter=2
    )
    styles["step_title"] = ParagraphStyle(
        "step_title", fontName="Helvetica-Bold", fontSize=11, leading=14,
        alignment=TA_LEFT, textColor=DARK_BLUE, leftIndent=24, spaceBefore=8, spaceAfter=2
    )
    styles["code"] = ParagraphStyle(
        "code", fontName="Courier", fontSize=8.5, leading=11,
        alignment=TA_LEFT, textColor=HexColor("#1A1A2E"), backColor=LIGHT_GRAY,
        leftIndent=12, rightIndent=12, spaceBefore=4, spaceAfter=4,
        borderPadding=(6, 6, 6, 6)
    )
    styles["info_text"] = ParagraphStyle(
        "info_text", fontName="Helvetica", fontSize=9, leading=12,
        textColor=DARK_GRAY
    )
    styles["footer"] = ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=7, textColor=MEDIUM_GRAY,
        alignment=TA_CENTER
    )
    styles["toc_entry"] = ParagraphStyle(
        "toc_entry", fontName="Helvetica", fontSize=11, leading=22,
        textColor=DARK_GRAY, leftIndent=20
    )
    styles["toc_chapter"] = ParagraphStyle(
        "toc_chapter", fontName="Helvetica-Bold", fontSize=12, leading=26,
        textColor=DARK_BLUE
    )
    return styles


# ── Page Templates ──
def cover_page(c, doc):
    """Draw the cover page background."""
    c.saveState()
    try:
        img = ImageReader(FARM_IMG)
        c.drawImage(img, 0, 0, width=PAGE_W, height=PAGE_H, preserveAspectRatio=True, anchor='c', mask='auto')
    except:
        pass
    c.setFillColor(Color(0.106, 0.31, 0.447, alpha=0.82))
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(Color(0.106, 0.31, 0.447, alpha=0.95))
    c.rect(0, PAGE_H * 0.30, PAGE_W, PAGE_H * 0.45, fill=1, stroke=0)
    c.setStrokeColor(GREEN)
    c.setLineWidth(3)
    c.line(60, PAGE_H * 0.72, PAGE_W - 60, PAGE_H * 0.72)
    c.line(60, PAGE_H * 0.33, PAGE_W - 60, PAGE_H * 0.33)
    c.restoreState()


def normal_page(c, doc):
    """Draw header and footer on normal pages."""
    c.saveState()
    c.setFillColor(DARK_BLUE)
    c.rect(0, PAGE_H - 28, PAGE_W, 28, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, PAGE_H - 31, PAGE_W, 3, fill=1, stroke=0)
    try:
        logo = ImageReader(LOGO)
        c.drawImage(logo, 15, PAGE_H - 24, width=70, height=15, preserveAspectRatio=True, mask='auto')
    except:
        pass
    c.setFillColor(white)
    c.setFont("Helvetica", 7)
    c.drawRightString(PAGE_W - 15, PAGE_H - 20, "INSECE Cloud  |  Manual de Usuario  |  v3.2.2-PRO")
    c.setFillColor(LIGHT_GRAY)
    c.rect(0, 0, PAGE_W, 24, fill=1, stroke=0)
    c.setFillColor(GREEN)
    c.rect(0, 24, PAGE_W, 1.5, fill=1, stroke=0)
    c.setFillColor(MEDIUM_GRAY)
    c.setFont("Helvetica", 7)
    c.drawString(30, 9, "INSECE SondApp Solutions  -  Confidencial")
    c.drawRightString(PAGE_W - 30, 9, f"Pagina {doc.page}")
    c.restoreState()


def toc_page(c, doc):
    """Header/footer for TOC page."""
    normal_page(c, doc)


# ── Build ──
def build_manual():
    doc = BaseDocTemplate(
        OUTPUT, pagesize=A4,
        leftMargin=25*mm, rightMargin=25*mm,
        topMargin=38*mm, bottomMargin=30*mm
    )

    content_width = PAGE_W - 50*mm
    styles = get_styles()

    cover_frame = Frame(0, 0, PAGE_W, PAGE_H, leftPadding=0, rightPadding=0,
                        topPadding=0, bottomPadding=0, id='cover')
    normal_frame = Frame(25*mm, 30*mm, content_width, PAGE_H - 68*mm, id='normal')

    doc.addPageTemplates([
        PageTemplate(id='cover', frames=cover_frame, onPage=cover_page),
        PageTemplate(id='normal', frames=normal_frame, onPage=normal_page),
        PageTemplate(id='toc', frames=normal_frame, onPage=toc_page),
    ])

    story = []

    # ═══════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════
    story.append(Spacer(1, PAGE_H * 0.32))
    try:
        logo_img = Image(LOGO, width=200, height=43)
        logo_img.hAlign = 'CENTER'
        story.append(logo_img)
    except:
        pass
    story.append(Spacer(1, 18))
    cover_title = ParagraphStyle("cover_title", fontName="Helvetica-Bold",
                                  fontSize=32, leading=38, alignment=TA_CENTER, textColor=white)
    story.append(Paragraph("Manual de Usuario", cover_title))
    story.append(Spacer(1, 8))
    cover_sub = ParagraphStyle("cover_sub", fontName="Helvetica",
                                fontSize=14, leading=18, alignment=TA_CENTER, textColor=GREEN)
    story.append(Paragraph("SCADA Agricola  -  Agricultura de Precision", cover_sub))
    story.append(Spacer(1, PAGE_H * 0.12))
    cover_meta = ParagraphStyle("cover_meta", fontName="Helvetica",
                                 fontSize=11, leading=16, alignment=TA_CENTER, textColor=HexColor("#BDC3C7"))
    story.append(Paragraph("Version 3.2.2-PRO  |  Mayo 2026", cover_meta))
    story.append(Spacer(1, 6))
    story.append(Paragraph("INSECE SondApp Solutions", cover_meta))

    # ═══════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════
    from reportlab.platypus import NextPageTemplate
    story.append(NextPageTemplate('toc'))
    story.append(PageBreak())

    story.append(ChapterTitle("", "INDICE DE CONTENIDOS", content_width))
    story.append(Spacer(1, 16))
    story.append(GradientBar(content_width, 3, GREEN, DARK_BLUE))
    story.append(Spacer(1, 20))

    toc_items = [
        ("1", "Introduccion y Vision General"),
        ("2", "La Sonda INSECE (Hardware)"),
        ("3", "App Movil - Guia del Operario"),
        ("4", "Panel Web Dashboard"),
        ("5", "SCADA y Drones"),
        ("6", "Notificaciones Push (Firebase)"),
        ("7", "Administracion del Sistema"),
        ("8", "Pagos y Suscripciones (Stripe)"),
    ]

    toc_data = []
    for num, title in toc_items:
        toc_data.append([
            Paragraph(f'<font color="#{GREEN.hexval()[2:]}">{num}</font>',
                      ParagraphStyle("tn", fontName="Helvetica-Bold", fontSize=16, textColor=GREEN, alignment=TA_CENTER)),
            Paragraph(f'<b>{title}</b>', styles["toc_chapter"])
        ])

    toc_table = Table(toc_data, colWidths=[35, content_width - 45])
    toc_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (0, -1), 4),
        ('LEFTPADDING', (1, 0), (1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, HexColor("#E5E8E8")),
    ]))
    story.append(toc_table)

    # ═══════════════════════════════════════
    # CHAPTER 1 — Introduccion y Vision General
    # ═══════════════════════════════════════
    story.append(NextPageTemplate('normal'))
    story.append(PageBreak())
    story.append(ChapterTitle(1, "INTRODUCCION Y VISION GENERAL", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "<b>INSECE</b> es una plataforma integral de IoT agricola que conecta sondas de suelo inteligentes "
        "con aplicaciones moviles y un servidor cloud, permitiendo a los agricultores y tecnicos agronomos "
        "monitorizar en tiempo real las condiciones del terreno para optimizar el riego, la fertilizacion y "
        "la productividad de sus cultivos.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Arquitectura del Sistema", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El ecosistema INSECE se estructura en tres capas independientes pero sincronizadas, "
        "siguiendo una arquitectura cliente-servidor de tres niveles:",
        styles["body"]
    ))
    story.append(Spacer(1, 6))

    arch_data = [
        [Paragraph('<b>Capa</b>', ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=white, alignment=TA_CENTER)),
         Paragraph('<b>Componente</b>', ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=white, alignment=TA_CENTER)),
         Paragraph('<b>Tecnologia</b>', ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=white, alignment=TA_CENTER))],
        [Paragraph('Dispositivo', styles["body"]),
         Paragraph('Sonda de suelo INSECE', styles["body"]),
         Paragraph('ESP32 + Bluetooth BLE', styles["body"])],
        [Paragraph('Aplicacion', styles["body"]),
         Paragraph('Apps moviles Android / iOS', styles["body"]),
         Paragraph('Kotlin / Swift + SQLite local', styles["body"])],
        [Paragraph('Servidor', styles["body"]),
         Paragraph('API Cloud + Base de Datos', styles["body"]),
         Paragraph('Node.js/Express + PostgreSQL 16', styles["body"])],
    ]

    arch_table = Table(arch_data, colWidths=[content_width*0.2, content_width*0.4, content_width*0.4])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('BACKGROUND', (0, 1), (-1, 1), VERY_LIGHT_GREEN),
        ('BACKGROUND', (0, 2), (-1, 2), white),
        ('BACKGROUND', (0, 3), (-1, 3), VERY_LIGHT_GREEN),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('ROUNDEDCORNERS', [4, 4, 4, 4]),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Flujo de Trabajo Completo", content_width))
    story.append(Spacer(1, 8))

    flow_steps = [
        ("<b>1. Captura:</b> La sonda clava sus electrodos en la tierra y toma lecturas electricas directas del suelo (humedad, pH, nutrientes, etc.).",),
        ("<b>2. Transmision Local:</b> La app movil recibe las lecturas via Bluetooth BLE y las muestra en la pantalla del smartphone del agricultor.",),
        ("<b>3. Sincronizacion:</b> La app empaqueta las lecturas y las envia al Servidor Cloud usando la conexion a Internet del telefono.",),
        ("<b>4. Almacenamiento:</b> El servidor verifica el token JWT del usuario y almacena los datos en PostgreSQL con coordenadas GPS.",),
        ("<b>5. Visualizacion:</b> El Administrador visualiza las lecturas en mapas y graficos del Panel Web Dashboard.",),
        ("<b>6. Alertas:</b> Si los valores son criticos, se envian notificaciones Push via Firebase Cloud Messaging a los dispositivos de campo.",),
    ]

    for step in flow_steps:
        story.append(Paragraph(step[0], styles["bullet"]))

    story.append(Spacer(1, 10))

    try:
        farm = Image(FARM_IMG, width=content_width * 0.7, height=content_width * 0.35)
        farm.hAlign = 'CENTER'
        story.append(farm)
        story.append(Spacer(1, 4))
        cap_style = ParagraphStyle("cap", fontName="Helvetica-Oblique", fontSize=8,
                                    textColor=MEDIUM_GRAY, alignment=TA_CENTER)
        story.append(Paragraph("Vista aerea de explotacion agricola monitorizada con INSECE", cap_style))
    except:
        pass

    # ═══════════════════════════════════════
    # CHAPTER 2 — La Sonda INSECE
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(2, "LA SONDA INSECE (HARDWARE)", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "La sonda INSECE es un dispositivo electromecanico de alta precision. Consta de una varilla de acero "
        "inoxidable con sensores multiples y una carcasa superior estanca que alberga la bateria recargable "
        "y la placa electronica Bluetooth basada en el chip <b>ESP32</b>.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Parametros del Suelo y Rangos Optimos", content_width))
    story.append(Spacer(1, 8))

    th_style = ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=9, textColor=white, alignment=TA_CENTER)
    td_style = ParagraphStyle("td", fontName="Helvetica", fontSize=9, leading=12, textColor=DARK_GRAY)
    td_center = ParagraphStyle("tdc", fontName="Helvetica", fontSize=9, leading=12, textColor=DARK_GRAY, alignment=TA_CENTER)

    params_data = [
        [Paragraph('<b>Parametro</b>', th_style),
         Paragraph('<b>Que mide</b>', th_style),
         Paragraph('<b>Unidad</b>', th_style),
         Paragraph('<b>Rango Optimo</b>', th_style),
         Paragraph('<b>Importancia Agronomica</b>', th_style)],
        [Paragraph('<b>Humedad</b>', td_style),
         Paragraph('Contenido de agua en la tierra', td_style),
         Paragraph('%', td_center),
         Paragraph('20% - 60%', td_center),
         Paragraph('Evita asfixia radicular o estres hidrico', td_style)],
        [Paragraph('<b>Temperatura</b>', td_style),
         Paragraph('Calor a nivel de raiz', td_style),
         Paragraph('C', td_center),
         Paragraph('15 - 28 C', td_center),
         Paragraph('Influye en absorcion de agua y microorganismos', td_style)],
        [Paragraph('<b>Conductividad (EC)</b>', td_style),
         Paragraph('Salinidad del terreno', td_style),
         Paragraph('dS/m', td_center),
         Paragraph('0.5 - 2.5', td_center),
         Paragraph('Indica fertilizantes disueltos; exceso quema raices', td_style)],
        [Paragraph('<b>pH</b>', td_style),
         Paragraph('Acidez o alcalinidad', td_style),
         Paragraph('Escala pH', td_center),
         Paragraph('6.0 - 7.5', td_center),
         Paragraph('Determina absorcion de nutrientes', td_style)],
        [Paragraph('<b>Nitrogeno (N)</b>', td_style),
         Paragraph('Nutriente de crecimiento', td_style),
         Paragraph('mg/kg', td_center),
         Paragraph('50 - 150', td_center),
         Paragraph('Desarrollo de hojas y tallos', td_style)],
        [Paragraph('<b>Fosforo (P)</b>', td_style),
         Paragraph('Nutriente de raices', td_style),
         Paragraph('mg/kg', td_center),
         Paragraph('20 - 80', td_center),
         Paragraph('Enraizamiento, floracion y cuajado de frutos', td_style)],
        [Paragraph('<b>Potasio (K)</b>', td_style),
         Paragraph('Nutriente de calidad', td_style),
         Paragraph('mg/kg', td_center),
         Paragraph('100 - 300', td_center),
         Paragraph('Regulacion de estomas, resistencia a sequia', td_style)],
    ]

    params_table = Table(params_data, colWidths=[
        content_width*0.16, content_width*0.22, content_width*0.10, content_width*0.14, content_width*0.38
    ])
    tbl_style = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(params_data)):
        if i % 2 == 0:
            tbl_style.append(('BACKGROUND', (0, i), (-1, i), VERY_LIGHT_GREEN))
        else:
            tbl_style.append(('BACKGROUND', (0, i), (-1, i), white))

    params_table.setStyle(TableStyle(tbl_style))
    story.append(params_table)
    story.append(Spacer(1, 14))

    story.append(InfoBox(
        "<b>Importante:</b> Antes de clavar la sonda, humedezca ligeramente el terreno si esta muy seco "
        "para evitar lecturas de conductividad erroneas. La profundidad recomendada es de 15-30 cm "
        "dependiendo del tipo de cultivo.",
        content_width, "warning", styles["info_text"]
    ))

    # ═══════════════════════════════════════
    # CHAPTER 3 — App Movil
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(3, "APP MOVIL - GUIA DEL OPERARIO", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "Las aplicaciones moviles de INSECE estan disponibles para <b>Android</b> (Google Play Store) "
        "e <b>iOS</b> (Apple App Store). Estan disenadas para funcionar en el campo de forma sencilla.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    # Step 1
    story.append(SectionTitle("Paso 1: Instalacion y Permisos", content_width))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Descarga la aplicacion desde la tienda correspondiente a tu dispositivo. Al abrirla por primera vez, "
        "se solicitaran los siguientes permisos obligatorios:",
        styles["body"]
    ))
    story.append(Paragraph("- <b>Ubicacion (GPS):</b> Necesario para geolocalizar las lecturas de suelo en el mapa.", styles["bullet"]))
    story.append(Paragraph("- <b>Bluetooth:</b> Imprescindible para comunicarse con la sonda INSECE via BLE.", styles["bullet"]))
    story.append(Spacer(1, 6))
    story.append(InfoBox(
        '<b>Permisos:</b> Debes seleccionar "Permitir siempre" o "Permitir al usar la app". '
        'Si deniegas estos permisos, la app no podra localizar la sonda ni registrar coordenadas GPS.',
        content_width, "warning", styles["info_text"]
    ))
    story.append(Spacer(1, 12))

    # Step 2
    story.append(SectionTitle("Paso 2: Crear una Cuenta", content_width))
    story.append(Spacer(1, 6))
    story.append(Paragraph("1. En la pantalla de bienvenida, pulsa <b>\"Crear Cuenta\"</b>.", styles["step"]))
    story.append(Paragraph("2. Rellena los campos: <b>Nombre Completo</b>, <b>Email</b> y una contrasena de al menos 6 caracteres.", styles["step"]))
    story.append(Paragraph("3. El sistema enviara un <b>correo de verificacion</b>. Abre tu email y haz clic en el enlace de activacion.", styles["step"]))
    story.append(Paragraph("4. Vuelve a la app e inicia sesion con tu email y contrasena.", styles["step"]))
    story.append(Spacer(1, 12))

    # Step 3
    story.append(SectionTitle("Paso 3: Conectar la Sonda y Tomar Lecturas", content_width))
    story.append(Spacer(1, 6))
    story.append(Paragraph("1. Asegurate de estar a <b>menos de 10 metros</b> de la sonda fisica.", styles["step"]))
    story.append(Paragraph("2. Clava la sonda en el terreno hasta la profundidad recomendada (15-30 cm).", styles["step"]))
    story.append(Paragraph("3. En la pestana principal, el telefono buscara dispositivos BLE cercanos.", styles["step"]))
    story.append(Paragraph('4. Selecciona <b>"INSECE_PROBE"</b> en la lista y pulsa <b>"Conectar"</b>.', styles["step"]))
    story.append(Paragraph("5. Los valores de humedad, pH, etc. se actualizaran en tiempo real en pantalla.", styles["step"]))
    story.append(Paragraph('6. Pulsa <b>"Guardar Lectura"</b> para almacenar la medicion con coordenadas GPS automaticas.', styles["step"]))
    story.append(Spacer(1, 12))

    # Step 4
    story.append(SectionTitle("Paso 4: Exportar Datos", content_width))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        'Desde la pestana <b>"Historial"</b> puedes ver todas tus mediciones ordenadas por fecha. '
        'Pulsa el icono de compartir (esquina superior derecha) para exportar:',
        styles["body"]
    ))
    story.append(Paragraph("- <b>CSV:</b> Archivo compatible con Excel para analisis detallado.", styles["bullet"]))
    story.append(Paragraph("- <b>PDF:</b> Reporte visual listo para imprimir o enviar al cliente.", styles["bullet"]))
    story.append(Paragraph("Puedes compartir via <b>WhatsApp</b>, <b>Email</b>, <b>Telegram</b> o guardar en el telefono.", styles["body"]))
    story.append(Spacer(1, 12))

    # Step 5
    story.append(SectionTitle("Paso 5: Eliminar Cuenta", content_width))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        'En <b>Ajustes > "Eliminar Cuenta"</b>, introduce tu contrasena para confirmar. '
        'Se ejecuta un borrado permanente e inmediato de todos tus datos del servidor y del dispositivo local, '
        'cumpliendo con la normativa de privacidad de Apple y Google.',
        styles["body"]
    ))
    story.append(Spacer(1, 6))
    story.append(InfoBox(
        "<b>Atencion:</b> La eliminacion de cuenta es irreversible. Todos los datos de lecturas, "
        "historiales y configuraciones se borraran permanentemente.",
        content_width, "danger", styles["info_text"]
    ))

    # ═══════════════════════════════════════
    # CHAPTER 4 — Panel Web Dashboard
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(4, "PANEL WEB DASHBOARD", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "El Panel Web Dashboard de INSECE es la interfaz de administracion principal, accesible desde "
        "cualquier navegador moderno. Ofrece una vision completa de todas las fincas, lecturas y usuarios.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Inicio de Sesion", content_width))
    story.append(Spacer(1, 8))
    try:
        login = Image(LOGIN_IMG, width=content_width * 0.55, height=content_width * 0.34)
        login.hAlign = 'CENTER'
        story.append(login)
        story.append(Spacer(1, 4))
        story.append(Paragraph("Pantalla de acceso al Panel Web INSECE", cap_style))
    except:
        pass
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Introduce tu correo electronico y contrasena, luego pulsa <b>\"INICIAR SESION\"</b>. "
        "Si las credenciales son correctas, seras redirigido al area personal segun tu rol (Super Admin o Cliente).",
        styles["body"]
    ))
    story.append(Spacer(1, 12))

    story.append(SectionTitle("Dashboard Principal", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El dashboard general muestra un <b>mapa centralizado</b> de todas tus fincas conectadas con sus "
        "lecturas geoposicionadas. En la zona inferior se presentan los KPIs principales:",
        styles["body"]
    ))
    story.append(Paragraph("- <b>Humedad del Suelo:</b> Promedio general de todas las sondas activas.", styles["bullet"]))
    story.append(Paragraph("- <b>Temperatura:</b> Temperatura media a nivel radicular.", styles["bullet"]))
    story.append(Paragraph("- <b>Conductividad (CE):</b> Indicador de salinidad agregado.", styles["bullet"]))
    story.append(Paragraph("- <b>Lecturas Totales:</b> Contador acumulado de mediciones.", styles["bullet"]))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Navegacion y Menus", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El menu lateral izquierdo permite saltar entre las distintas secciones del sistema. "
        "Las opciones visibles dependen del rol del usuario:",
        styles["body"]
    ))

    menu_data = [
        [Paragraph('<b>Seccion</b>', th_style), Paragraph('<b>Descripcion</b>', th_style), Paragraph('<b>Rol</b>', th_style)],
        [Paragraph('Telemetria', td_style), Paragraph('Datos de sondas, graficas y mapas', td_style), Paragraph('Todos', td_center)],
        [Paragraph('Drones / SCADA', td_style), Paragraph('Control de misiones aereas Sentinel', td_style), Paragraph('Admin', td_center)],
        [Paragraph('Analiticas', td_style), Paragraph('NDVI, indices de vegetacion', td_style), Paragraph('Admin', td_center)],
        [Paragraph('Clientes', td_style), Paragraph('Gestion de usuarios y fincas', td_style), Paragraph('Super Admin', td_center)],
        [Paragraph('Notificaciones', td_style), Paragraph('Envio de alertas push masivas', td_style), Paragraph('Super Admin', td_center)],
    ]

    menu_table = Table(menu_data, colWidths=[content_width*0.25, content_width*0.50, content_width*0.25])
    menu_style = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(menu_data)):
        menu_style.append(('BACKGROUND', (0, i), (-1, i), VERY_LIGHT_GREEN if i % 2 == 0 else white))
    menu_table.setStyle(TableStyle(menu_style))
    story.append(menu_table)
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Analiticas NDVI y Vision Satelital", content_width))
    story.append(Spacer(1, 8))
    try:
        dash = Image(DASHBOARD_IMG, width=content_width * 0.85, height=content_width * 0.42)
        dash.hAlign = 'CENTER'
        story.append(dash)
        story.append(Spacer(1, 4))
        story.append(Paragraph("Panel de estres de cultivos con vision satelital NDVI", cap_style))
    except:
        pass

    # ═══════════════════════════════════════
    # CHAPTER 5 — SCADA y Drones
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(5, "SCADA Y DRONES", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "El modulo SCADA (Supervisory Control And Data Acquisition) de INSECE proporciona una "
        "vision industrial de la explotacion agricola, integrando sensores de campo, sistemas de riego "
        "y operaciones con drones en un panel de control unificado.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    try:
        scada = Image(SCADA_IMG, width=content_width * 0.65, height=content_width * 0.65)
        scada.hAlign = 'CENTER'
        story.append(scada)
        story.append(Spacer(1, 4))
        story.append(Paragraph("Diagrama SCADA: integracion de sensores, bombas e infraestructura de riego", cap_style))
    except:
        pass
    story.append(Spacer(1, 12))

    story.append(SectionTitle("Sentinel V3 - Operaciones con Drones", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El sistema <b>Sentinel V3</b> permite planificar y ejecutar misiones de mapeo aereo con drones:",
        styles["body"]
    ))
    story.append(Paragraph("- <b>Planificacion de vuelo:</b> Trazado de cotas de elevacion y rutas de cobertura.", styles["bullet"]))
    story.append(Paragraph("- <b>Mapeo multiespectral:</b> Captura de imagenes en bandas visibles e infrarrojas para generar indices NDVI.", styles["bullet"]))
    story.append(Paragraph("- <b>Modelo del terreno:</b> Generacion de modelos digitales de elevacion (DEM) para analisis topografico.", styles["bullet"]))
    story.append(Spacer(1, 12))

    story.append(SectionTitle("Configuracion de Alarmas SCADA", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Los paneles SCADA muestran en tiempo real el estado de tanques de agua, bombas de riego "
        "e indicadores de suelo. Para configurar alarmas:",
        styles["body"]
    ))
    story.append(Paragraph("1. Haz clic en el icono de ajustes del sensor deseado.", styles["step"]))
    story.append(Paragraph("2. Establece el <b>Limite Minimo</b> (ej: Humedad &lt; 25%).", styles["step"]))
    story.append(Paragraph("3. Establece el <b>Limite Maximo</b> (ej: Humedad &gt; 75%).", styles["step"]))
    story.append(Paragraph("4. Si una lectura cae fuera del rango, el indicador parpadeara en <b>rojo</b> y se registrara una alerta critica.", styles["step"]))
    story.append(Spacer(1, 8))

    try:
        ndvi = Image(NDVI_IMG, width=content_width * 0.85, height=content_width * 0.42)
        ndvi.hAlign = 'CENTER'
        story.append(ndvi)
        story.append(Spacer(1, 4))
        story.append(Paragraph("Mapa NDVI multiespectral generado por dron Sentinel", cap_style))
    except:
        pass

    # ═══════════════════════════════════════
    # CHAPTER 6 — Notificaciones Push
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(6, "NOTIFICACIONES PUSH (FIREBASE)", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "Las notificaciones push permiten enviar alertas instantaneas a los dispositivos de los "
        "agricultores y tecnicos, incluso cuando la app esta cerrada. INSECE utiliza <b>Firebase Cloud "
        "Messaging (FCM)</b> de Google como intermediario certificado.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Flujo de Envio de Notificaciones", content_width))
    story.append(Spacer(1, 8))

    flow_data = [
        [Paragraph('<b>Paso</b>', th_style), Paragraph('<b>Origen</b>', th_style), Paragraph('<b>Destino</b>', th_style), Paragraph('<b>Protocolo</b>', th_style)],
        [Paragraph('1', td_center), Paragraph('Panel Web Dashboard', td_style), Paragraph('Servidor Cloud INSECE', td_style), Paragraph('HTTPS + JWT', td_center)],
        [Paragraph('2', td_center), Paragraph('Servidor Cloud', td_style), Paragraph('Firebase (FCM)', td_style), Paragraph('HTTPS + clave secreta', td_center)],
        [Paragraph('3a', td_center), Paragraph('Firebase', td_style), Paragraph('Red APNs (Apple)', td_style), Paragraph('APNs push', td_center)],
        [Paragraph('3b', td_center), Paragraph('Firebase', td_style), Paragraph('Red Google Play', td_style), Paragraph('FCM push', td_center)],
        [Paragraph('4', td_center), Paragraph('Red del operador', td_style), Paragraph('Dispositivo del agricultor', td_style), Paragraph('Alerta nativa', td_center)],
    ]

    flow_table = Table(flow_data, colWidths=[content_width*0.08, content_width*0.28, content_width*0.34, content_width*0.30])
    flow_style = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]
    for i in range(1, len(flow_data)):
        flow_style.append(('BACKGROUND', (0, i), (-1, i), VERY_LIGHT_GREEN if i % 2 == 0 else white))
    flow_table.setStyle(TableStyle(flow_style))
    story.append(flow_table)
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Registro de Dispositivos", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El proceso de registro es automatico y transparente para el usuario final:",
        styles["body"]
    ))
    story.append(Paragraph("1. Al iniciar la app, el codigo solicita a Firebase un <b>Token unico de dispositivo</b>.", styles["step"]))
    story.append(Paragraph("2. La app envia este token al Servidor Cloud, que lo almacena en PostgreSQL asociado al usuario.", styles["step"]))
    story.append(Paragraph("3. Al enviar una notificacion, el servidor recupera los tokens del destinatario y los remite a Firebase.", styles["step"]))
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Enviar Notificaciones desde el Panel Web", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph("1. Inicia sesion con credenciales de <b>Administrador</b>.", styles["step"]))
    story.append(Paragraph('2. Navega a la seccion <b>"Notificaciones"</b> o <b>"Marketing y Mensajes"</b>.', styles["step"]))
    story.append(Paragraph("3. Rellena el <b>Titulo</b> (texto corto y descriptivo) y el <b>Mensaje</b> (detalle de la alerta).", styles["step"]))
    story.append(Paragraph("4. Selecciona la plataforma: <b>Todos</b>, <b>Android</b> o <b>iOS</b>.", styles["step"]))
    story.append(Paragraph('5. Pulsa <b>"Enviar Notificacion Push"</b>. El sistema confirmara el numero de dispositivos alcanzados.', styles["step"]))
    story.append(Spacer(1, 10))

    story.append(InfoBox(
        "<b>Alternativa:</b> Si el Panel Web no esta disponible, puedes enviar notificaciones directamente "
        "desde la Consola de Firebase (console.firebase.google.com) > Cloud Messaging > Nueva Campana.",
        content_width, "info", styles["info_text"]
    ))

    # ═══════════════════════════════════════
    # CHAPTER 7 — Administracion del Sistema
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(7, "ADMINISTRACION DEL SISTEMA", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "Esta seccion esta dirigida al equipo tecnico encargado de mantener el servidor, "
        "la base de datos y la infraestructura cloud de INSECE.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Stack Tecnologico del Servidor", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph("- <b>Backend API:</b> Node.js con framework Express (API RESTful).", styles["bullet"]))
    story.append(Paragraph("- <b>Base de Datos:</b> PostgreSQL 16 (motor relacional de nivel industrial).", styles["bullet"]))
    story.append(Paragraph("- <b>Despliegue:</b> Docker Compose con contenedores <font face='Courier' size='9'>insece_api</font> y <font face='Courier' size='9'>insece_postgres</font>.", styles["bullet"]))
    story.append(Paragraph("- <b>Seguridad:</b> Autenticacion JWT (JSON Web Token) con cifrado bcrypt para contrasenas.", styles["bullet"]))
    story.append(Spacer(1, 12))

    story.append(SectionTitle("Estructura de la Base de Datos", content_width))
    story.append(Spacer(1, 8))

    db_tables = [
        [Paragraph('<b>Tabla</b>', th_style), Paragraph('<b>Campos Principales</b>', th_style), Paragraph('<b>Descripcion</b>', th_style)],
        [Paragraph('<font face="Courier">users</font>', td_style),
         Paragraph('<font face="Courier" size="8">id, email, password_hash, full_name, role</font>', td_style),
         Paragraph('Usuarios del sistema (admin, client, worker)', td_style)],
        [Paragraph('<font face="Courier">fincas</font>', td_style),
         Paragraph('<font face="Courier" size="8">id, name, owner_id, bounds</font>', td_style),
         Paragraph('Fincas con poligonos GPS', td_style)],
        [Paragraph('<font face="Courier">readings</font>', td_style),
         Paragraph('<font face="Courier" size="8">id, user_id, finca_id, temperature,<br/>moisture, conductivity, ph, nitrogen,<br/>phosphorus, potassium, lat, lng, created_at</font>', td_style),
         Paragraph('Lecturas de sensores geolocalizadas', td_style)],
    ]

    db_table = Table(db_tables, colWidths=[content_width*0.15, content_width*0.50, content_width*0.35])
    db_style = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (0, 1), (-1, 1), white),
        ('BACKGROUND', (0, 2), (-1, 2), VERY_LIGHT_GREEN),
        ('BACKGROUND', (0, 3), (-1, 3), white),
    ]
    db_table.setStyle(TableStyle(db_style))
    story.append(db_table)
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Consultas SQL de Administracion", content_width))
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Ver todos los usuarios registrados:</b>", styles["body_bold"]))
    story.append(Paragraph(
        '<font face="Courier" size="8.5">'
        'SELECT id, email, full_name, role FROM users ORDER BY id DESC;'
        '</font>', styles["code"]
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Lecturas recientes de una finca:</b>", styles["body_bold"]))
    story.append(Paragraph(
        '<font face="Courier" size="8.5">'
        'SELECT r.created_at, u.full_name, r.moisture, r.ph, r.conductivity<br/>'
        'FROM readings r JOIN users u ON r.user_id = u.id<br/>'
        'WHERE r.finca_id = 1 ORDER BY r.created_at DESC LIMIT 50;'
        '</font>', styles["code"]
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Lecturas por trabajador:</b>", styles["body_bold"]))
    story.append(Paragraph(
        '<font face="Courier" size="8.5">'
        'SELECT u.full_name, COUNT(r.id) as total_lecturas<br/>'
        'FROM readings r JOIN users u ON r.user_id = u.id<br/>'
        'GROUP BY u.full_name ORDER BY total_lecturas DESC;'
        '</font>', styles["code"]
    ))
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Recuperacion ante Fallos (PostgreSQL)", content_width))
    story.append(Spacer(1, 8))
    story.append(InfoBox(
        '<b>CRITICO:</b> Nunca elimine la carpeta <font face="Courier">postgres_data</font>. '
        'Contiene todos los datos de clientes, lecturas e historiales.',
        content_width, "danger", styles["info_text"]
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Si PostgreSQL se corrompe por un apagado brusco (error: <i>PANIC: could not locate a valid "
        "checkpoint record</i>), se debe usar <font face='Courier' size='9'>pg_resetwal</font> montando un contenedor temporal. "
        "Consulte al equipo de desarrollo antes de ejecutar esta operacion.",
        styles["body"]
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("<b>Reiniciar el servidor:</b>", styles["body_bold"]))
    story.append(Paragraph(
        '<font face="Courier" size="8.5">docker-compose restart insece_api</font>',
        styles["code"]
    ))

    # ═══════════════════════════════════════
    # CHAPTER 8 — Pagos y Suscripciones
    # ═══════════════════════════════════════
    story.append(PageBreak())
    story.append(ChapterTitle(8, "PAGOS Y SUSCRIPCIONES (STRIPE)", content_width))
    story.append(Spacer(1, 12))
    story.append(GradientBar(content_width, 2, GREEN, LIGHT_BLUE))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        "INSECE integra <b>Stripe</b>, la plataforma de pasarela de pago mas segura del mercado, "
        "para gestionar las suscripciones de los clientes de forma automatizada.",
        styles["body"]
    ))
    story.append(Spacer(1, 10))

    story.append(SectionTitle("Seguridad de los Pagos", content_width))
    story.append(Spacer(1, 8))
    story.append(InfoBox(
        "<b>PCI-DSS:</b> El servidor de INSECE nunca almacena numeros de tarjeta ni datos bancarios. "
        "Todos los datos financieros viajan directamente a los servidores de Stripe de forma encriptada. "
        "Stripe devuelve un Token que representa la suscripcion activa.",
        content_width, "info", styles["info_text"]
    ))
    story.append(Spacer(1, 12))

    story.append(SectionTitle("Planes de Suscripcion", content_width))
    story.append(Spacer(1, 8))

    plans_data = [
        [Paragraph('<b>Caracteristica</b>', th_style),
         Paragraph('<b>Plan Basico</b>', th_style),
         Paragraph('<b>Plan Premium</b>', th_style)],
        [Paragraph('Fincas monitorizadas', td_style),
         Paragraph('1 finca', td_center),
         Paragraph('Ilimitadas', td_center)],
        [Paragraph('Usuarios por cuenta', td_style),
         Paragraph('Hasta 3', td_center),
         Paragraph('Ilimitados', td_center)],
        [Paragraph('Historial de lecturas', td_style),
         Paragraph('Ultimos 6 meses', td_center),
         Paragraph('Sin limite', td_center)],
        [Paragraph('Alertas Push automaticas', td_style),
         Paragraph('No incluidas', td_center),
         Paragraph('Incluidas', td_center)],
        [Paragraph('Soporte SCADA/Drones', td_style),
         Paragraph('No incluido', td_center),
         Paragraph('Incluido', td_center)],
        [Paragraph('Exportacion de datos', td_style),
         Paragraph('CSV', td_center),
         Paragraph('CSV + PDF + API', td_center)],
    ]

    plans_table = Table(plans_data, colWidths=[content_width*0.40, content_width*0.30, content_width*0.30])
    plans_style = [
        ('BACKGROUND', (0, 0), (-1, 0), DARK_BLUE),
        ('GRID', (0, 0), (-1, -1), 0.5, HexColor("#D5D8DC")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('BACKGROUND', (2, 1), (2, -1), HexColor("#E8F8F5")),
    ]
    for i in range(1, len(plans_data)):
        if i % 2 == 0:
            plans_style.append(('BACKGROUND', (0, i), (1, i), VERY_LIGHT_GREEN))
    plans_table.setStyle(TableStyle(plans_style))
    story.append(plans_table)
    story.append(Spacer(1, 14))

    story.append(SectionTitle("Flujo de Pago con Webhooks", content_width))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "El proceso de cobro y activacion es completamente automatico:",
        styles["body"]
    ))
    story.append(Paragraph("1. El cliente accede al Panel Web y ve el estado de su suscripcion.", styles["step"]))
    story.append(Paragraph("2. Si su plan ha caducado, es redirigido al <b>formulario seguro de Stripe</b>.", styles["step"]))
    story.append(Paragraph("3. Stripe procesa el pago de forma encriptada (el servidor INSECE nunca ve la tarjeta).", styles["step"]))
    story.append(Paragraph("4. Stripe envia un <b>Webhook</b> (senal HTTP silenciosa) al Servidor Cloud.", styles["step"]))
    story.append(Paragraph("5. El servidor reactiva automaticamente los accesos del cliente al instante.", styles["step"]))
    story.append(Spacer(1, 14))

    # ── Final page ──
    story.append(Spacer(1, 40))
    story.append(GradientBar(content_width, 3, DARK_BLUE, GREEN))
    story.append(Spacer(1, 20))

    end_style = ParagraphStyle("end", fontName="Helvetica-Bold", fontSize=14,
                                alignment=TA_CENTER, textColor=DARK_BLUE)
    story.append(Paragraph("INSECE SondApp Solutions", end_style))
    story.append(Spacer(1, 8))
    end_sub = ParagraphStyle("end_sub", fontName="Helvetica", fontSize=10,
                              alignment=TA_CENTER, textColor=MEDIUM_GRAY)
    story.append(Paragraph("Revolucion Agricola  |  Agricultura de Precision", end_sub))
    story.append(Spacer(1, 6))
    story.append(Paragraph("Documento generado - Mayo 2026  |  Todos los derechos reservados", end_sub))
    story.append(Spacer(1, 20))
    story.append(GradientBar(content_width, 3, GREEN, DARK_BLUE))

    # ── Build the doc ──
    doc.build(story)
    print(f"Manual generado exitosamente: {OUTPUT}")
    print(f"Tamano: {os.path.getsize(OUTPUT) / 1024:.0f} KB")


if __name__ == "__main__":
    build_manual()
