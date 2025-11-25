import Head from 'next/head'
import Header from '@components/Header'
import Footer from '@components/Footer'
import { useState } from 'react'

export default function Home() {
  const [registros, setRegistros] = useState([])
  const [formData, setFormData] = useState({
    paciente: '',
    rmssd: '',
    fc: '',
    lf_hf: '',
    contexto: '',
    tipo_respiracion: ''
  })

  // TUS FÓRMULAS TRADUCIDAS A JAVASCRIPT
  const calcularZona = (rmssd, promedio, desviacion) => {
    if (!rmssd) return ''
    if (!promedio || promedio === "1ra medición") return "1ra medición"
    if (rmssd >= promedio) return "VERDE"
    if (rmssd >= promedio - desviacion) return "AMARILLA"
    return "ROJA"
  }

  const calcularRecomendacion = (zona) => {
    if (!zona) return ''
    if (zona === "1ra medición") return "REFERENCIA INICIAL"
    if (zona === "VERDE") return "SEGUIR PLAN"
    if (zona === "AMARILLA") return "AJUSTAR CARGA"
    return "PRIORIZAR RECUPERACIÓN"
  }

  const calcularActividadVagal = (rmssd, lf_hf) => {
    if (!rmssd || !lf_hf) return ''
    if (rmssd >= 70 && lf_hf <= 0.7) return "VAGAL_FUERTE"
    if (rmssd >= 50 && lf_hf <= 1.5) return "EQUILIBRADO"
    return "SIMPA_DOMINANTE"
  }

  const calcularTipoRespiracion = (lf_hf) => {
    if (!lf_hf) return ''
    if (lf_hf < 0.5) return "ACTIVADORA"
    if (lf_hf <= 2) return "BALANCEADORA"
    return "CALMANTE"
  }

  const calcularPatronRespiracion = (actVagal) => {
    if (!actVagal) return ''
    const patrones = {
      "VAGAL_FUERTE": "4-2-4",
      "EQUILIBRADO": "4-2-6", 
      "SIMPA_DOMINANTE": "4-2-8"
    }
    return patrones[actVagal] || ""
  }

  const calcularRecomendacionFinal = (actVagal) => {
    if (!actVagal) return ''
    if (actVagal === "VAGAL_FUERTE") return "Enfoque en ACTIVACIÓN suave. Evite sobre-estimulación."
    if (actVagal === "EQUILIBRADO") return "Mantenga BALANCE. Enfoque en recuperación activa."
    return "Priorice CALMA. Reduzca carga y estimulación."
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Obtener registros del mismo paciente para cálculos
    const registrosPaciente = registros.filter(r => r.paciente === formData.paciente)
    const valoresRmssd = registrosPaciente.map(r => parseFloat(r.rmssd))
    
    // Cálculos como en Excel
    const promedio = valoresRmssd.length >= 1 ? 
      valoresRmssd.reduce((a, b) => a + b, 0) / valoresRmssd.length : "1ra medición"
    
    const desviacion = valoresRmssd.length >= 2 ? 
      Math.sqrt(valoresRmssd.map(x => Math.pow(x - promedio, 2)).reduce((a, b) => a + b) / valoresRmssd.length) : "1ra medición"

    // Aplicar todas las fórmulas
    const nuevoRegistro = {
      id: Date.now(),
      fecha: new Date().toLocaleDateString(),
      ...formData,
      zona: calcularZona(parseFloat(formData.rmssd), promedio, desviacion),
      recomendacion: calcularRecomendacion(calcularZona(parseFloat(formData.rmssd), promedio, desviacion)),
      act_vagal: calcularActividadVagal(parseFloat(formData.rmssd), parseFloat(formData.lf_hf)),
      tipo_respiracion: calcularTipoRespiracion(parseFloat(formData.lf_hf)),
      patron_respiracion: calcularPatronRespiracion(calcularActividadVagal(parseFloat(formData.rmssd), parseFloat(formData.lf_hf))),
      recomendacion_final: calcularRecomendacionFinal(calcularActividadVagal(parseFloat(formData.rmssd), parseFloat(formData.lf_hf)))
    }

    setRegistros([nuevoRegistro, ...registros])
    setFormData({ paciente: '', rmssd: '', fc: '', lf_hf: '', contexto: '', tipo_respiracion: '' })
  }

  return (
    <div className="container">
      <Head>
        <title>Regulación NeuroCardiaca HF1</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Header title="Regulación NeuroCardiaca HF1" />
        <p className="description">
          Sistema de Monitoreo de Variabilidad Cardíaca
        </p>
        
        <div className="grid">
          {/* FORMULARIO VFC - COLUMNAS 1-12 */}
          <div className="card">
            <h3>📊 Registro VFC</h3>
            <form onSubmit={handleSubmit}>
              <input 
                type="text" 
                placeholder="Nombre del Paciente" 
                value={formData.paciente}
                onChange={(e) => setFormData({...formData, paciente: e.target.value})}
                required
              />
              <input 
                type="number" 
                placeholder="RMSSD" 
                value={formData.rmssd}
                onChange={(e) => setFormData({...formData, rmssd: e.target.value})}
                step="0.01"
                required
              />
              <input 
                type="number" 
                placeholder="Frecuencia Cardíaca" 
                value={formData.fc}
                onChange={(e) => setFormData({...formData, fc: e.target.value})}
                required
              />
              <input 
                type="number" 
                placeholder="LF/HF Ratio" 
                value={formData.lf_hf}
                onChange={(e) => setFormData({...formData, lf_hf: e.target.value})}
                step="0.01"
                required
              />
              <select 
                value={formData.contexto}
                onChange={(e) => setFormData({...formData, contexto: e.target.value})}
                required
              >
                <option value="">Seleccionar Contexto</option>
                <option value="A">A - Óptimo (sueño bueno, sin estrés)</option>
                <option value="B">B - Normal (sueño regular, estrés leve)</option>
                <option value="C">C - Cautela (sueño pobre, estrés moderado)</option>
                <option value="D">D - Alerta (sueño muy pobre, estrés alto)</option>
              </select>
              <button type="submit">Guardar Registro</button>
            </form>
          </div>

          {/* HISTORIAL VFC - COLUMNAS 13-24 */}
          <div className="card">
            <h3>📈 Historial VFC (Últimas 20)</h3>
            {registros.slice(0, 20).map(registro => (
              <div key={registro.id} className="registro-item">
                <p><strong>{registro.paciente}</strong> - {registro.fecha}</p>
                <p>RMSSD: {registro.rmssd} | Zona: <span className={`zona-${registro.zona?.toLowerCase()}`}>{registro.zona}</span></p>
                <p>Recomendación: {registro.recomendacion}</p>
                <p>Patrón: {registro.patron_respiracion} | Tipo: {registro.tipo_respiracion}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
