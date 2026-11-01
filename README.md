# Sistema de Cálculo Eléctrico en Baja Tensión (REBT - RD 842/2002 e ITC-BT-01 a BT-52)

Plataforma de ingeniería eléctrica desarrollada con **Next.js 15**, **TypeScript**, **Tailwind CSS**, **Supabase (Postgres)** y desplegada en **Vercel**, basada íntegramente en el **Reglamento Electrotécnico para Baja Tensión (Real Decreto 842/2002, texto consolidado BOE actualizado a septiembre de 2025)** y sus Instrucciones Técnicas Complementarias (**ITC-BT-01 a ITC-BT-52**).

## Módulos Normativos Incluidos

1. **Cuadro de Circuitos Interiores y Derivación Individual (ITC-BT-15, ITC-BT-19, ITC-BT-20, ITC-BT-21, ITC-BT-22, ITC-BT-25)**:
   - Secciones normalizadas en $\text{mm}^2$ (`1,5` a `300 mm²`) en Cobre ($\text{Cu}$) y Aluminio ($\text{Al}$), aislamientos **PVC (70 °C)** y **XLPE/EPR (90 °C)**.
   - Verificación automática de la condición de protección contra sobrecargas ($I_b \le I_n \le I_z$ a $40\text{ }^\circ\text{C}$, Tabla 1 ITC-BT-19).
   - Cálculo de caída de tensión ($\Delta U\%$) con límites reglamentarios ($3\%$ en vivienda/alumbrado, $5\%$ en fuerza/recarga VE, $1,0\% / 1,5\%$ en Derivación Individual, $0,5\% / 1,0\%$ en LGA).
   - Coeficientes obligatorios para motores ($\times 1,25$ según ITC-BT-47) y lámparas de descarga ($\times 1,8$ según ITC-BT-09 / ITC-BT-44).
   - Selección de sección del conductor de protección $S_p$ (Tabla 2 ITC-BT-18/19) y diámetro exterior de tubo protector en $\text{mm}$ (ITC-BT-21).
   - Plantillas oficiales precargadas de **Electrificación Básica ($C_1$ a $C_5$)** y **Electrificación Elevada + Recarga VE ($C_1$ a $C_{13}$)** según ITC-BT-25.

2. **Previsión de Cargas del Edificio y Línea General de Alimentación (ITC-BT-10, ITC-BT-14, ITC-BT-16, ITC-BT-52)**:
   - Cálculo de carga de viviendas ($P_1$) con coeficiente de simultaneidad $C_s$ (Tabla 1 ITC-BT-10).
   - Servicios generales ($P_2$), locales comerciales y oficinas ($P_3$, mín. $100\text{ W/m}^2$ y $3.450\text{ W/local}$), garajes ($P_4$, $10\text{ W/m}^2$ ventilación natural / $20\text{ W/m}^2$ ventilación forzada).
   - Infraestructura de recarga de vehículos eléctricos ($P_5$, $10\%$ de plazas a $3.680\text{ W}$ con factor multiplicador $0,3$ si dispone de **SPL** según ITC-BT-10 / ITC-BT-52).
   - Dimensionamiento automático de la **LGA** en trifásico $400\text{ V}$ ($\Delta U \le 0,5\%$) y del **Interruptor General de Maniobra (IGM)** ($160\text{ A} / 250\text{ A}$).

3. **Documentación y Legalización (ITC-BT-04 e ITC-BT-05)**:
   - Clasificador reglamentario para determinar si la instalación requiere **Proyecto Técnico** o **Memoria Técnica de Diseño (MTD)** según los grupos `a` a `z` de la ITC-BT-04.
   - Determinación automática de obligatoriedad de **Inspección Inicial por Organismo de Control (OCA)** según ITC-BT-05.

4. **Puesta a Tierra y Protección contra Contactos Indirectos (ITC-BT-18 e ITC-BT-24)**:
   - Cálculo de resistencia de tierra estimada ($R_t$) combinando picas verticales en paralelo y conductor horizontal enterrado (Tabla 5 ITC-BT-18).
   - Verificación de la condición $R_A \cdot I_{\Delta n} \le U_L$ ($50\text{ V}$ locales secos / $24\text{ V}$ locales húmedos o exteriores) en esquema TT.

