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
  const [busqueda, setBusqueda] = useState('')
  const [mostrarResumen, setMostrarResumen] = useState(false)
  const [resumenPaciente, setResumenPaciente] = useState(null)
  const [formData, setFormData] = useState({
    paciente_id: '',
    nuevo_paciente: '',
    edad: '',
    sexo: '',
    tipo_paciente: '',
    rmssd: '',
    fc: '',
    lf_hf: '',
    sdnn: '',
    respiration_rate: '',
    contexto: '',
    alteracion_biopsicosocial: '',
    nivel_estres: '',
    observaciones_clinicas: ''
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
      .select('*, pacientes(nombre, edad, sexo, tipo_paciente)')
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (data) {
      setRegistros(data)
      generarAlertas(data)
    }
  }

  const generarAlertas = (registros) => {
    const nuevasAlertas = []
    if (registros.length > 0) {
      const ultimoRegistro = registros[0]
      
      if (ultimoRegistro.zona === 'ROJA') {
        nuevasAlertas.push({
          tipo: 'urgente',
          mensaje: `🚨 ${ultimoRegistro.pacientes.nombre} en ZONA ROJA - Priorizar recuperación inmediata`
        })
      } else if (ultimoRegistro.zona === 'AMARILLA') {
        nuevasAlertas.push({
          tipo: 'advertencia', 
          mensaje: `⚠️ ${ultimoRegistro.pacientes.nombre} en ZONA AMARILLA - Ajustar carga de entrenamiento`
        })
      }
      
      // Alerta por tendencia desfavorable
      const ultimos3 = registros.slice(0, 3)
      if (ultimos3.length >= 3) {
        const zonasRecientes = ultimos3.map(r => r.zona)
        if (zonasRecientes.every(z => z === 'ROJA' || z === 'AMARILLA')) {
          nuevasAlertas.push({
            tipo: 'tendencia',
            mensaje: `📊 ${ultimoRegistro.pacientes.nombre} muestra tendencia desfavorable en últimas 3 mediciones`
          })
        }
      }
    }
    setAlertas(nuevasAlertas)
  }

  // Fórmulas actualizadas
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
    if (zona === "1ra medición") return "ESTABLECER LÍNEA BASE - Evaluar factores contextuales"
    if (zona === "VERDE") return "ÓPTIMO - Mantener protocolo actual"
    if (zona === "AMARILLA") return "CAUTELA - Ajustar carga y monitorizar"
    return "ALERTA - Priorizar recuperación y reducir estrés"
  }

  const calcularActividadVagal = (rmssd, lf_hf) => {
    if (rmssd >= 70 && lf_hf <= 0.7) return "TONO VAGAL DOMINANTE"
    if (rmssd >= 50 && lf_hf <= 1.5) return "EQUILIBRIO AUTONÓMICO"
    return "ACTIVACIÓN SIMPÁTICA DOMINANTE"
  }

  const calcularTipoRespiracion = (lf_hf, respiration_rate) => {
    if (lf_hf < 0.5) return "PATRÓN ACTIVADOR"
    if (lf_hf <= 2) return "PATRÓN BALANCEADO"
    return "PATRÓN CALMANTE"
  }

  const interpretarRespirationRate = (rate) => {
    if (!rate) return "SIN REGISTRO"
    if (rate < 12) return "BRADIPNEA"
    if (rate <= 20) return "NORMOPNEA"
    return "TAQUIPNEA"
  }

  const interpretarContexto = (contexto) => {
    const contextos = {
      'A': 'ÓPTIMO - Sueño reparador, baja carga alostática',
      'B': 'NORMAL - Sueño adecuado, estrés leve controlado', 
      'C': 'CAUTELA - Calidad de sueño reducida, estrés moderado',
      'D': 'ALERTA - Privación de sueño, alta carga alostática'
    }
    return contextos[contexto] || "NO ESPECIFICADO"
  }

  const generarResumen = (pacienteId) => {
    const paciente = pacientes.find(p => p.id === pacienteId)
    const historialPaciente = registros.filter(r => r.paciente_id === pacienteId)
    
    setResumenPaciente({
      paciente,
      historial: historialPaciente,
      totalMediciones: historialPaciente.length,
      promedioRMSSD: historialPaciente.reduce((sum, r) => sum + parseFloat(r.rmssd), 0) / historialPaciente.length,
      zonas: historialPaciente.reduce((acc, r) => {
        acc[r.zona] = (acc[r.zona] || 0) + 1
        return acc
      }, {})
    })
    setMostrarResumen(true)
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
    const sdnnNum = parseFloat(formData.sdnn)
    const respirationNum = parseFloat(formData.respiration_rate)
    
    const zona = calcularZona(rmssdNum, registrosPaciente || [])
    const actVagal = calcularActividadVagal(rmssdNum, lfHfNum)

    const { error } = await supabase
      .from('registros_vfc')
      .insert([{
        paciente_id: formData.paciente_id,
        rmssd: rmssdNum,
        fc: parseInt(formData.fc),
        lf_hf: lfHfNum,
        sdnn: sdnnNum,
        respiration_rate: respirationNum,
        contexto: formData.contexto,
        alteracion_biopsicosocial: formData.alteracion_biopsicosocial,
        nivel_estres: formData.nivel_estres,
        observaciones_clinicas: formData.observaciones_clinicas,
        zona: zona,
        recomendacion: calcularRecomendacion(zona),
        act_vagal: actVagal,
        tipo_respiracion: calcularTipoRespiracion(lfHfNum, respirationNum),
        patron_respiracion: interpretarRespirationRate(respirationNum)
      }])

    if (!error) {
      await cargarHistorialPaciente(formData.paciente_id)
      setFormData({
        ...formData,
        rmssd: '',
        fc: '',
        lf_hf: '',
        sdnn: '',
        respiration_rate: '',
        contexto: '',
        alteracion_biopsicosocial: '',
        nivel_estres: '',
        observaciones_clinicas: ''
      })
    }
  }

  // Pacientes filtrados por búsqueda
  const pacientesFiltrados = pacientes.filter(paciente =>
    paciente.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="container">
      <Head>
        <title>NeuroCardio VFC - Sistema Avanzado</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <Header title="NeuroCardio VFC - Sistema Avanzado" />
        
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
            {/* BÚSQUEDA Y SELECCIÓN DE PACIENTE */}
            <div style={{marginBottom: '20px'}}>
              <div style={{fontWeight: 'bold', marginBottom: '5px'}}>BUSCAR PACIENTE:</div>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                style={{width: '100%', padding: '8px', marginBottom: '10px'}}
              />
              <select 
                value={formData.paciente_id}
                onChange={(e) => {
                  setFormData({...formData, paciente_id: e.target.value})
                  cargarHistorialPaciente(e.target.value)
                }}
                style={{width: '100%', padding: '8px'}}
              >
                <option value="">-- Seleccionar Paciente --</option>
                {pacientesFiltrados.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>
                    {paciente.nombre} {paciente.edad && `(${paciente.edad} años)`} - {paciente.tipo_paciente}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN RESUMEN */}
            {formData.paciente_id && (
              <button 
                onClick={() => generarResumen(formData.paciente_id)}
                style={{
                  width: '100%', 
                  padding: '10px', 
                  background: '#8b5cf6',
                  color: 'white', 
                  border: 'none',
                  marginBottom: '20px',
                  fontSize: '16px'
                }}
              >
                📊 GENERAR RESUMEN COMPLETO
              </button>
            )}

            {/* NUEVO PACIENTE */}
            <div style={{border: '1px solid #ddd', padding: '15px', marginBottom: '20px'}}>
              <div style={{fontWeight: 'bold', marginBottom: '10px'}}>➕ NUEVO PACIENTE:</div>
              <input 
                type="text" 
                placeholder="Nombre completo"
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
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                <select 
                  value={formData.tipo_paciente}
                  onChange={(e) => setFormData({...formData, tipo_paciente: e.target.value})}
                  style={{padding: '8px'}}
                >
                  <option value="">Tipo</option>
                  <option value="deportista_amateur">Deportista Amateur</option>
                  <option value="alto_rendimiento">Alto Rendimiento</option>
                  <option value="lesion_ortopedica">Lesión Ortopédica</option>
                </select>
              </div>
              <button 
                onClick={agregarPaciente}
                style={{width: '100%', padding: '8px', marginTop: '10px', background: '#007acc', color: 'white', border: 'none'}}
              >
                + Agregar Paciente
              </button>
            </div>

            {/* REGISTRO VFC COMPLETO */}
            <div style={{border: '1px solid #ddd', padding: '15px'}}>
              <div style={{fontWeight: 'bold', marginBottom: '10px'}}>📈 REGISTRO VFC COMPLETO:</div>
              <form onSubmit={handleSubmit}>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px'}}>
                  <input 
                    type="number" 
                    placeholder="RMSSD (ms)"
                    value={formData.rmssd}
                    onChange={(e) => setFormData({...formData, rmssd: e.target.value})}
                    step="0.01"
                    required
                    style={{padding: '8px'}}
                  />
                  <input 
                    type="number" 
                    placeholder="SDNN (ms)"
                    value={formData.sdnn}
                    onChange={(e) => setFormData({...formData, sdnn: e.target.value})}
                    step="0.01"
                    style={{padding: '8px'}}
                  />
                </div>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px'}}>
                  <input 
                    type="number" 
                    placeholder="FC (bpm)"
                    value={formData.fc}
                    onChange={(e) => setFormData({...formData, fc: e.target.value})}
                    required
                    style={{padding: '8px'}}
                  />
                  <input 
                    type="number" 
                    placeholder="LF/HF Ratio"
                    value={formData.lf_hf}
                    onChange={(e) => setFormData({...formData, lf_hf: e.target.value})}
                    step="0.01"
                    required
                    style={{padding: '8px'}}
                  />
                </div>
                <input 
                  type="number" 
                  placeholder="Frecuencia Respiratoria (rpm)"
                  value={formData.respiration_rate}
                  onChange={(e) => setFormData({...formData, respiration_rate: e.target.value})}
                  style={{width: '100%', padding: '8px', marginBottom: '5px'}}
                />
                
                <select 
                  value={formData.contexto}
                  onChange={(e) => setFormData({...formData, contexto: e.target.value})}
                  required
                  style={{width: '100%', padding: '8px', marginBottom: '5px'}}
                >
                  <option value="">Contexto Actual</option>
                  <option value="A">A - Óptimo</option>
                  <option value="B">B - Normal</option>
                  <option value="C">C - Cautela</option>
                  <option value="D">D - Alerta</option>
                </select>

                <select 
                  value={formData.nivel_estres}
                  onChange={(e) => setFormData({...formData, nivel_estres: e.target.value})}
                  style={{width: '100%', padding: '8px', marginBottom: '5px'}}
                >
                  <option value="">Nivel de Estrés Percibido</option>
                  <option value="1">1 - Muy Bajo</option>
                  <option value="2">2 - Bajo</option>
                  <option value="3">3 - Moderado</option>
                  <option value="4">4 - Alto</option>
                  <option value="5">5 - Muy Alto</option>
                </select>

                <textarea 
                  placeholder="Alteraciones biopsicosociales relevantes..."
                  value={formData.alteracion_biopsicosocial}
                  onChange={(e) => setFormData({...formData, alteracion_biopsicosocial: e.target.value})}
                  style={{width: '100%', padding: '8px', marginBottom: '5px', minHeight: '60px'}}
                />

                <textarea 
                  placeholder="Observaciones clínicas..."
                  value={formData.observaciones_clinicas}
                  onChange={(e) => setFormData({...formData, observaciones_clinicas: e.target.value})}
                  style={{width: '100%', padding: '8px', marginBottom: '10px', minHeight: '60px'}}
                />

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
                  💾 GUARDAR REGISTRO COMPLETO
                </button>
              </form>
            </div>
          </div>

          {/* COLUMNA DERECHA - HISTORIAL DETALLADO */}
          <div>
            <div style={{fontWeight: 'bold', marginBottom: '10px', fontSize: '18px'}}>
              📋 HISTORIAL DETALLADO {formData.paciente_id ? `(${registros.length} mediciones)` : ''}
            </div>
            
            {registros.length === 0 ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                {formData.paciente_id ? 'No hay registros para este paciente' : 'Selecciona un paciente para ver el historial'}
              </div>
            ) : (
              registros.map((registro, index) => (
                <div key={registro.id} style={{
                  border: '1px solid #ddd',
                  padding: '15px',
                  marginBottom: '15px',
                  background: '#f9f9f9'
                }}>
                  <div style={{fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px'}}>
                    🔬 MEDICIÓN #{registros.length - index} - {new Date(registro.created_at).toLocaleDateString()} {new Date(registro.created_at).toLocaleTimeString()}
                  </div>
                  
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px'}}>
                    <div>
                      <div><strong>RMSSD:</strong> {registro.rmssd} ms</div>
                      <div><strong>SDNN:</strong> {registro.sdnn || 'N/A'} ms</div>
                      <div><strong>FC:</strong> {registro.fc} bpm</div>
                      <div><strong>LF/HF:</strong> {registro.lf_hf}</div>
                    </div>
                    <div>
                      <div><strong>Frec. Respiratoria:</strong> {registro.respiration_rate || 'N/A'} rpm</div>
                      <div><strong>Patrón Respiratorio:</strong> {registro.patron_respiracion}</div>
                      <div><strong>Nivel Estrés:</strong> {registro.nivel_estres || 'N/A'}/5</div>
                    </div>
                  </div>

                  <div style={{marginBottom: '10px'}}>
                    <div><strong>ZONA:</strong> 
                      <span style={{
                        color: registro.zona === 'VERDE' ? 'green' : 
                               registro.zona === 'AMARILLA' ? 'orange' : 'red',
                        fontWeight: 'bold',
                        marginLeft: '5px'
                      }}>
                        {registro.zona}
                      </span>
                    </div>
                    <div><strong>Actividad Autonómica:</strong> {registro.act_vagal}</div>
                    <div><strong>Tipo Respiración:</strong> {registro.tipo_respiracion}</div>
                  </div>

                  <div style={{marginBottom: '10px'}}>
                    <div><strong>Contexto:</strong> {interpretarContexto(registro.contexto)}</div>
                    <div><strong>Recomendación:</strong> {registro.recomendacion}</div>
                  </div>

                  {registro.alteracion_biopsicosocial && (
                    <div style={{marginBottom: '5px'}}>
                      <strong>Alteraciones Biopsicosociales:</strong> {registro.alteracion_biopsicosocial}
                    </div>
                  )}

                  {registro.observaciones_clinicas && (
                    <div>
                      <strong>Observaciones Clínicas:</strong> {registro.observaciones_clinicas}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODAL DE RESUMEN */}
        {mostrarResumen && resumenPaciente && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '30px',
              borderRadius: '10px',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'auto',
              width: '90%'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                <h2>📊 RESUMEN NEUROCIENTÍFICO</h2>
                <button 
                  onClick={() => setMostrarResumen(false)}
                  style={{background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px'}}
                >
                  Cerrar
                </button>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3>👤 DATOS DEL PACIENTE</h3>
                <p><strong>Nombre:</strong> {resumenPaciente.paciente.nombre}</p>
                <p><strong>Edad:</strong> {resumenPaciente.paciente.edad} años</p>
                <p><strong>Sexo:</strong> {resumenPaciente.paciente.sexo === 'M' ? 'Masculino' : 'Femenino'}</p>
                <p><strong>Tipo:</strong> {resumenPaciente.paciente.tipo_paciente}</p>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3>🧠 PROTOCOLO NEUROCIENTÍFICO</h3>
                <p>El análisis de Variabilidad Cardíaca (VFC) evalúa la comunicación corazón-cerebro mediante el sistema nervioso autónomo. 
                Parámetros como RMSSD reflejan la capacidad de recuperación vagal, mientras LF/HF indica el balance simpático-vagal. 
                Estos marcadores objetivan tu resiliencia neurofisiológica y capacidad adaptativa.</p>
              </div>

              <div style={{marginBottom: '20px'}}>
                <h3>📈 ESTADÍSTICAS</h3>
                <p><strong>Total de mediciones:</strong> {resumenPaciente.totalMediciones}</p>
                <p><strong>RMSSD promedio:</strong> {resumenPaciente.promedioRMSSD.toFixed(2)} ms</p>
                <p><strong>Distribución de zonas:</strong></p>
                <ul>
                  {Object.entries(resumenPaciente.zonas).map(([zona, count]) => (
                    <li key={zona}>
                      {zona}: {count} mediciones (
}
