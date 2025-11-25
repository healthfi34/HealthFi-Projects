import Head from 'next/head'
import Header from '@components/Header'
import Footer from '@components/Footer'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase - USA TUS CREDENCIALES AQUÍ
const supabaseUrl = 'https://jcmytlillgregzpaxlfb.supabase.co'
const supabaseKey = 'sb_publishable__ylp7MwUh3RY8UU2ub8qBQ_TOtHeIq5'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [pacientes, setPacientes] = useState([])
  const [registros, setRegistros] = useState([])
  const [formData, setFormData] = useState({
    paciente_id: '',
    nuevo_paciente: '',
    edad: '',
    sexo: '',
    tipo_paciente: '',
    rmssd: '',
    fc: '',
    lf_hf: '',
    contexto: '',
    tipo_respiracion: ''
  })

  // Cargar pacientes desde Supabase
  useEffect(() => {
    cargarPacientes()
    cargarRegistros()
  }, [])

  const cargarPacientes = async () => {
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setPacientes(data || [])
  }

  const cargarRegistros = async () => {
    const { data, error } = await supabase
      .from('registros_vfc')
      .select(`
        *,
        pacientes (nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (!error) setRegistros(data || [])
  }

  // TUS FÓRMULAS EXACTAS
  const calcularZona = (rmssd, registrosPaciente) => {
    if (!rmssd) return ''
    if (registrosPaciente.length === 0) return "1ra medición"
    
    const valoresRmssd = registrosPaciente.map(r => parseFloat(r.rmssd))
    const promedio = valoresRmssd.reduce((a, b) => a + b, 0) / valoresRmssd.length
    const desviacion = Math.sqrt(valoresRmssd.map(x => Math.pow(x - promedio, 2)).reduce((a, b) => a + b) / valoresRmssd.length)
    
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

  const agregarPaciente = async () => {
    if (!formData.nuevo_paciente) return

    const { data, error } = await supabase
      .from('pacientes')
      .insert([
        {
          nombre: formData.nuevo_paciente,
          edad: formData.edad,
          sexo: formData.sexo,
          tipo_paciente: formData.tipo_paciente
        }
      ])
      .select()

    if (!error) {
      await cargarPacientes()
      setFormData({
        ...formData,
        nuevo_paciente: '',
        edad: '',
        sexo: '',
        tipo_paciente: '',
        paciente_id: data[0].id
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.paciente_id || !formData.rmssd) return

    // Obtener registros del paciente para cálculos
    const { data: registrosPaciente } = await supabase
      .from('registros_vfc')
      .select('*')
      .eq('paciente_id', formData.paciente_id)

    // Aplicar fórmulas
    const rmssdNum = parseFloat(formData.rmssd)
    const lfHfNum = parseFloat(formData.lf_hf)
    
    const zona = calcularZona(rmssdNum, registrosPaciente || [])
    const actVagal = calcularActividadVagal(rmssdNum, lfHfNum)

    const nuevoRegistro = {
      paciente_id: formData.paciente_id,
      rmssd: rmssdNum,
      fc: parseInt(formData.fc),
      lf_hf: lfHfNum,
      contexto: formData.contexto,
      zona: zona,
      recomendacion: calcularRecomendacion(zona),
      act_vagal: actVagal,
      tipo_respiracion: calcularTipoRespiracion(lfHfNum),
      patron_respiracion: calcularPatronRespiracion(actVagal),
      recomendacion_final: calcularRecomendacionFinal(actVagal)
    }

    const { error } = await supabase
      .from('registros_vfc')
      .insert([nuevoRegistro])

    if (!error) {
      await cargarRegistros()
      setFormData({
        ...formData,
        rmssd: '',
        fc: '',
        lf_hf: '',
        contexto: ''
      })
    }
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
            
            {/* SELECCIÓN DE PACIENTE */}
            <div style={{marginBottom: '20px'}}>
              <label>Paciente:</label>
              <select 
                value={formData.paciente_id}
                onChange={(e) => setFormData({...formData, paciente_id: e.target.value})}
                required
              >
                <option value="">Seleccionar Paciente</option>
                {pacientes.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nombre} {paciente.edad && `(${paciente.edad}años)`}
                  </option>
                ))}
              </select>
            </div>

            {/* FORMULARIO NUEVO PACIENTE */}
            <div style={{border: '1px solid #ccc', padding: '10px', marginBottom: '20px'}}>
              <h4>➕ Nuevo Paciente</h4>
              <input 
                type="text" 
                placeholder="Nombre completo" 
                value={formData.nuevo_paciente}
                onChange={(e) => setFormData({...formData, nuevo_paciente: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Edad" 
                value={formData.edad}
                onChange={(e) => setFormData({...formData, edad: e.target.value})}
              />
              <select 
                value={formData.sexo}
                onChange={(e) => setFormData({...formData, sexo: e.target.value})}
              >
                <option value="">Sexo</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
              <select 
                value={formData.tipo_paciente}
                onChange={(e) => setFormData({...formData, tipo_paciente: e.target.value})}
              >
                <option value="">Tipo de Paciente</option>
                <option value="deportista_amateur">Deportista Amateur</option>
                <option value="alto_rendimiento">Alto Rendimiento</option>
                <option value="lesion_ortopedica">Lesión Ortopédica</option>
              </select>
              <button type="button" onClick={agregarPaciente}>
                Agregar Paciente
              </button>
            </div>

            {/* FORMULARIO VFC */}
            <form onSubmit={handleSubmit}>
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
              <button type="submit" disabled={!formData.paciente_id}>
                Guardar Registro VFC
              </button>
            </form>
          </div>

          {/* HISTORIAL VFC - COLUMNAS 13-24 */}
          <div className="card">
            <h3>📈 Historial VFC (Últimas 20)</h3>
            {registros.map(registro => (
              <div key={registro.id} className="registro-item">
                <p><strong>{registro.pacientes?.nombre}</strong> - {new Date(registro.created_at).toLocaleDateString()}</p>
                <p>RMSSD: {registro.rmssd} | Zona: <span className={`zona-${registro.zona?.toLowerCase()?.replace(' ', '-')}`}>{registro.zona}</span></p>
                <p>Recomendación: {registro.recomendacion}</p>
                <p>Patrón: {registro.patron_respiracion} | Tipo: {registro.tipo_respiracion}</p>
                <p><em>{registro.recomendacion_final}</em></p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
