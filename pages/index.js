import Head from 'next/head'
import Header from '@components/Header'
import Footer from '@components/Footer'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jcmytlillgregzpaxlfb.supabase.co'
const supabaseKey = 'sb_publishable__ylp7MwUh3RY8UU2ub8qBQ_TOtHeIq5'
const supabase = createClient(supabaseUrl, supabaseKey)

export default function Home() {
  const [pacientes, setPacientes] = useState([])
  const [registros, setRegistros] = useState([])
  const [alertas, setAlertas] = useState([])
  const [formData, setFormData] = useState({
    paciente_id: '',
    nuevo_paciente: '',
    edad: '',
    sexo: '',
    tipo_paciente: '',
    rmssd: '',
    fc: '',
    lf_hf: '',
    contexto: ''
  })

  // Cargar datos iniciales
  useEffect(() => {
    cargarPacientes()
  }, [])

  const cargarPacientes = async () => {
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .order('nombre', { ascending: true })
    if (data) setPacientes(data)
  }

  const cargarHistorialPaciente = async (pacienteId) => {
    if (!pacienteId) {
      setRegistros([])
      setAlertas([])
      return
    }
    
    const { data } = await supabase
      .from('registros_vfc')
      .select('*, pacientes(nombre)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (data) {
      setRegistros(data)
      // Generar alertas
      const nuevasAlertas = []
      if (data.length > 0) {
        const ultimoRegistro = data[0]
        if (ultimoRegistro.zona === 'ROJA') {
          nuevasAlertas.push({
            tipo: 'urgente',
            mensaje: `🚨 ${ultimoRegistro.pacientes.nombre} en ZONA ROJA - Priorizar recuperación`
          })
        } else if (ultimoRegistro.zona === 'AMARILLA') {
          nuevasAlertas.push({
            tipo: 'advertencia', 
            mensaje: `⚠️ ${ultimoRegistro.pacientes.nombre} en ZONA AMARILLA - Ajustar carga`
          })
        }
        
        // Alerta si tiene 3+ registros rojos/amarillos seguidos
        const ultimos3 = data.slice(0, 3)
        const zonasRecientes = ultimos3.map(r => r.zona)
        if (zonasRecientes.every(z => z === 'ROJA' || z === 'AMARILLA')) {
          nuevasAlertas.push({
            tipo: 'tendencia',
            mensaje: `📊 ${ultimoRegistro.pacientes.nombre} con tendencia desfavorable`
          })
        }
      }
      setAlertas(nuevasAlertas)
    }
  }

  // Fórmulas (mantienen igual)
  const calcularZona = (rmssd, registrosPaciente) => {
    if (!rmssd || registrosPaciente.length === 0) return "1ra medición"
    
    const valoresRmssd = registrosPaciente.map(r => parseFloat(r.rmssd))
    const promedio = valoresRmssd.reduce((a, b) => a + b) / valoresRmssd.length
    const desviacion = Math.sqrt(valoresRmssd.map(x => Math.pow(x - promedio, 2)).reduce((a, b) => a + b) / valoresRmssd.length)
    
    if (rmssd >= promedio) return "VERDE"
    if (rmssd >= promedio - desviacion) return "AMARILLA"
    return "ROJA"
  }

  const calcularRecomendacion = (zona) => {
    if (zona === "1ra medición") return "REFERENCIA INICIAL"
    if (zona === "VERDE") return "SEGUIR PLAN"
    if (zona === "AMARILLA") return "AJUSTAR CARGA"
    return "PRIORIZAR RECUPERACIÓN"
  }

  const calcularActividadVagal = (rmssd, lf_hf) => {
    if (rmssd >= 70 && lf_hf <= 0.7) return "VAGAL_FUERTE"
    if (rmssd >= 50 && lf_hf <= 1.5) return "EQUILIBRADO"
    return "SIMPA_DOMINANTE"
  }

  const calcularTipoRespiracion = (lf_hf) => {
    if (lf_hf < 0.5) return "ACTIVADORA"
    if (lf_hf <= 2) return "BALANCEADORA"
    return "CALMANTE"
  }

  const calcularPatronRespiracion = (actVagal) => {
    const patrones = {
      "VAGAL_FUERTE": "4-2-4",
      "EQUILIBRADO": "4-2-6", 
      "SIMPA_DOMINANTE": "4-2-8"
    }
    return patrones[actVagal] || ""
  }

  const agregarPaciente = async () => {
    if (!formData.nuevo_paciente) return

    const { data } = await supabase
      .from('pacientes')
      .insert([{
        nombre: formData.nuevo_paciente,
        edad: formData.edad,
        sexo: formData.sexo,
        tipo_paciente: formData.tipo_paciente
      }])
      .select()

    if (data) {
      await cargarPacientes()
      setFormData({
        ...formData,
        nuevo_paciente: '',
        edad: '',
        sexo: '',
        tipo_paciente: '',
        paciente_id: data[0].id
      })
      cargarHistorialPaciente(data[0].id)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.paciente_id || !formData.rmssd) return

    const { data: registrosPaciente } = await supabase
      .from('registros_vfc')
      .select('*')
      .eq('paciente_id', formData.paciente_id)

    const rmssdNum = parseFloat(formData.rmssd)
    const lfHfNum = parseFloat(formData.lf_hf)
    
    const zona = calcularZona(rmssdNum, registrosPaciente || [])
    const actVagal = calcularActividadVagal(rmssdNum, lfHfNum)

    const { error } = await supabase
      .from('registros_vfc')
      .insert([{
        paciente_id: formData.paciente_id,
        rmssd: rmssdNum,
        fc: parseInt(formData.fc),
        lf_hf: lfHfNum,
        contexto: formData.contexto,
        zona: zona,
        recomendacion: calcularRecomendacion(zona),
        act_vagal: actVagal,
        tipo_respiracion: calcularTipoRespiracion(lfHfNum),
        patron_respiracion: calcularPatronRespiracion(actVagal)
      }])

    if (!error) {
      await cargarHistorialPaciente(formData.paciente_id)
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
        <title>NeuroCardio VFC</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Header title="NeuroCardio VFC" />
        
        {/* ALERTAS */}
        {alertas.length > 0 && (
          <div style={{marginBottom: '20px'}}>
            {alertas.map((alerta, index) => (
              <div key={index} style={{
                padding: '10px',
                marginBottom: '5px',
                background: alerta.tipo === 'urgente' ? '#fee2e2' : 
                           alerta.tipo === 'advertencia' ? '#fef3c7' : '#e0f2fe',
                border: alerta.tipo === 'urgente' ? '1px solid #dc2626' :
                        alerta.tipo === 'advertencia' ? '1px solid #d97706' : '1px solid #0369a1',
                borderRadius: '5px'
              }}>
                {alerta.mensaje}
              </div>
            ))}
          </div>
        )}
        
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px'}}>
          
          {/* COLUMNA IZQUIERDA */}
          <div>
            {/* SELECCIÓN DE PACIENTE */}
            <div style={{marginBottom: '20px'}}>
              <div style={{fontWeight: 'bold', marginBottom: '5px'}}>PACIENTE:</div>
              <select 
                value={formData.paciente_id}
                onChange={(e) => {
                  setFormData({...formData, paciente_id: e.target.value})
                  cargarHistorialPaciente(e.target.value)
                }}
                style={{width: '100%', padding: '8px'}}
              >
                <option value="">-- Seleccionar --</option>
                {pacientes.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nombre} {paciente.edad && `(${paciente.edad})`}
                  </option>
                ))}
              </select>
            </div>

            {/* NUEVO PACIENTE */}
            <div style={{border: '1px solid #ddd', padding: '15px', marginBottom: '20px'}}>
              <div style={{fontWeight: 'bold', marginBottom: '10px'}}>NUEVO PACIENTE:</div>
              <input 
                type="text" 
                placeholder="Nombre"
                value={formData.nuevo_paciente}
                onChange={(e) => setFormData({...formData, nuevo_paciente: e.target.value})}
                style={{width: '100%', padding: '8px', marginBottom: '5px'}}
              />
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px'}}>
                <input 
                  type="number" 
                  placeholder="Edad"
                  value={formData.edad}
                  onChange={(e) => setFormData({...formData, edad: e.target.value})}
                  style={{padding: '8px'}}
                />
                <select 
                  value={formData.sexo}
                  onChange={(e) => setFormData({...formData, sexo: e.target.value})}
                  style={{padding: '8px'}}
                >
                  <option value="">Sexo</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
                <select 
                  value={formData.tipo_paciente}
                  onChange={(e) => setFormData({...formData, tipo_paciente: e.target.value})}
                  style={{padding: '8px'}}
                >
                  <option value="">Tipo</option>
                  <option value="deportista_amateur">Amateur</option>
                  <option value="alto_rendimiento">Alto Rend.</option>
                  <option value="lesion_ortopedica">Lesión</option>
                </select>
              </div>
              <button 
                onClick={agregarPaciente}
                style={{width: '100%', padding: '8px', marginTop: '10px', background: '#007acc', color: 'white', border: 'none'}}
              >
                + Agregar Paciente
              </button>
            </div>

            {/* REGISTRO VFC */}
            <div style={{border: '1px solid #ddd', padding: '15px'}}>
              <div style={{fontWeight: 'bold', marginBottom: '10px'}}>REGISTRO VFC:</div>
              <form onSubmit={handleSubmit}>
                <input 
                  type="number" 
                  placeholder="RMSSD"
                  value={formData.rmssd}
                  onChange={(e) => setFormData({...formData, rmssd: e.target.value})}
                  step="0.01"
                  required
                  style={{width: '100%', padding: '8px', marginBottom: '5px'}}
                />
                <input 
                  type="number" 
                  placeholder="Frecuencia Cardíaca"
                  value={formData.fc}
                  onChange={(e) => setFormData({...formData, fc: e.target.value})}
                  required
                  style={{width: '100%', padding: '8px', marginBottom: '5px'}}
                />
                <input 
                  type="number" 
                  placeholder="LF/HF Ratio"
                  value={formData.lf_hf}
                  onChange={(e) => setFormData({...formData, lf_hf: e.target.value})}
                  step="0.01"
                  required
                  style={{width: '100%', padding: '8px', marginBottom: '5px'}}
                />
                <select 
                  value={formData.contexto}
                  onChange={(e) => setFormData({...formData, contexto: e.target.value})}
                  required
                  style={{width: '100%', padding: '8px', marginBottom: '10px'}}
                >
                  <option value="">Contexto</option>
                  <option value="A">A - Óptimo</option>
                  <option value="B">B - Normal</option>
                  <option value="C">C - Cautela</option>
                  <option value="D">D - Alerta</option>
                </select>
                <button 
                  type="submit" 
                  disabled={!formData.paciente_id}
                  style={{
                    width: '100%', 
                    padding: '10px', 
                    background: formData.paciente_id ? '#22c55e' : '#ccc',
                    color: 'white', 
                    border: 'none',
                    fontSize: '16px'
                  }}
                >
                  GUARDAR REGISTRO
                </button>
              </form>
            </div>
          </div>

          {/* COLUMNA DERECHA - HISTORIAL */}
          <div>
            <div style={{fontWeight: 'bold', marginBottom: '10px', fontSize: '18px'}}>
              HISTORIAL {formData.paciente_id ? `(${registros.length})` : ''}
            </div>
            
            {registros.length === 0 ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                {formData.paciente_id ? 'No hay registros' : 'Selecciona un paciente'}
              </div>
            ) : (
              registros.map(registro => (
                <div key={registro.id} style={{
                  border: '1px solid #ddd',
                  padding: '10px',
                  marginBottom: '10px',
                  background: '#f9f9f9'
                }}>
                  <div style={{fontWeight: 'bold'}}>
                    {new Date(registro.created_at).toLocaleDateString()} - {registro.pacientes?.nombre}
                  </div>
                  <div>RMSSD: <strong>{registro.rmssd}</strong></div>
                  <div>Zona: 
                    <span style={{
                      color: registro.zona === 'VERDE' ? 'green' : 
                             registro.zona === 'AMARILLA' ? 'orange' : 'red',
                      fontWeight: 'bold',
                      marginLeft: '5px'
                    }}>
                      {registro.zona}
                    </span>
                  </div>
                  <div>Recomendación: {registro.recomendacion}</div>
                  <div>Patrón: {registro.patron_respiracion} | Tipo: {registro.tipo_respiracion}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
