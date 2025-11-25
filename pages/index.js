import { useState } from 'react';

export default function HRVApp() {
  const [pacientes, setPacientes] = useState([]);
  const [nuevoPaciente, setNuevoPaciente] = useState({
    nombre: '',
    edad: '',
    sexo: '',
    tipo: ''
  });
  const [registroVFC, setRegistroVFC] = useState({
    rmssd: '',
    frecuenciaCardiaca: '',
    lfHFRatio: '',
    contexto: ''
  });

  const agregarPaciente = () => {
    if (nuevoPaciente.nombre && nuevoPaciente.edad) {
      setPacientes([...pacientes, { ...nuevoPaciente, id: Date.now() }]);
      setNuevoPaciente({ nombre: '', edad: '', sexo: '', tipo: '' });
      alert('Paciente agregado correctamente');
    }
  };

  const guardarRegistroVFC = () => {
    if (registroVFC.rmssd && registroVFC.frecuenciaCardiaca) {
      alert('Registro VFC guardado correctamente');
      setRegistroVFC({ rmssd: '', frecuenciaCardiaca: '', lfHFRatio: '', contexto: '' });
    }
  };

  const determinarZona = (rmssd) => {
    if (rmssd >= 90) return 'VERDE';
    if (rmssd >= 70) return 'AMARILLA';
    return 'ROJA';
  };

  const getRecomendacion = (zona) => {
    switch (zona) {
      case 'VERDE': return 'SEGUIR PLAN';
      case 'AMARILLA': return 'MONITOREAR';
      case 'ROJA': return 'PRIORIZAR RECUPERACIÓN';
      default: return 'REFERENCIA INICIAL';
    }
  };

  // Datos de ejemplo para el historial
  const historialEjemplo = [
    { nombre: 'Heber Miranda', fecha: '25/11/2025', rmssd: 93, patron: '4-2-6', tipo: 'BALANCEADORA' },
    { nombre: 'Heber Miranda', fecha: '25/11/2025', rmssd: 72, patron: '4-2-6', tipo: 'BALANCEADORA' },
    { nombre: 'Heber Miranda', fecha: '25/11/2025', rmssd: 95, patron: '4-2-6', tipo: 'BALANCEADORA' }
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      {/* SECCIÓN PACIENTE ACTUAL */}
      <div style={{ marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', marginBottom: '10px' }}># PACIENTE:</h2>
        <h3 style={{ color: '#007acc', margin: 0 }}>Heber Miranda (29)</h3>
      </div>

      {/* SECCIÓN NUEVO PACIENTE */}
      <div style={{ marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', marginBottom: '15px' }}>## NUEVO PACIENTE:</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Nombre"
            value={nuevoPaciente.nombre}
            onChange={(e) => setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Edad"
            value={nuevoPaciente.edad}
            onChange={(e) => setNuevoPaciente({...nuevoPaciente, edad: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <select
            value={nuevoPaciente.sexo}
            onChange={(e) => setNuevoPaciente({...nuevoPaciente, sexo: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="">Sexo</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
          </select>
          <select
            value={nuevoPaciente.tipo}
            onChange={(e) => setNuevoPaciente({...nuevoPaciente, tipo: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="">Tipo</option>
            <option value="deportista">Deportista</option>
            <option value="sedentario">Sedentario</option>
          </select>
        </div>
        <button
          onClick={agregarPaciente}
          style={{
            padding: '12px 25px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Agregar Paciente
        </button>
      </div>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #eee' }} />

      {/* SECCIÓN REGISTRO VFC */}
      <div style={{ marginBottom: '30px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', marginBottom: '15px' }}>### REGISTRO VFC:</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="RMSSD"
            value={registroVFC.rmssd}
            onChange={(e) => setRegistroVFC({...registroVFC, rmssd: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Frecuencia Cardiaca"
            value={registroVFC.frecuenciaCardiaca}
            onChange={(e) => setRegistroVFC({...registroVFC, frecuenciaCardiaca: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="LF/HF Ratio"
            value={registroVFC.lfHFRatio}
            onChange={(e) => setRegistroVFC({...registroVFC, lfHFRatio: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Contexto"
            value={registroVFC.contexto}
            onChange={(e) => setRegistroVFC({...registroVFC, contexto: e.target.value})}
            style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
          />
        </div>
        <button
          onClick={guardarRegistroVFC}
          style={{
            padding: '12px 25px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          GUARDAR REGISTRO
        </button>
      </div>

      <hr style={{ margin: '25px 0', border: 'none', borderTop: '2px solid #eee' }} />

      {/* SECCIÓN HISTORIAL */}
      <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <h2 style={{ color: '#333', marginBottom: '15px' }}>### HISTORIAL (3)</h2>
        {historialEjemplo.map((registro, index) => {
          const zona = determinarZona(registro.rmssd);
          const recomendacion = getRecomendacion(zona);
          const colorZona = zona === 'VERDE' ? '#28a745' : zona === 'AMARILLA' ? '#ffc107' : '#dc3545';
          
          return (
            <div key={index} style={{
              border: '1px solid #ddd',
              padding: '15px',
              marginBottom: '15px',
              borderRadius: '6px',
              backgroundColor: 'white'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>{registro.nombre} - {registro.fecha}</h4>
              <p style={{ margin: '5px 0' }}><strong>RMSSD:</strong> {registro.rmssd} | <strong>Zona:</strong> 
                <span style={{ color: colorZona, fontWeight: 'bold', marginLeft: '5px' }}> {zona}</span>
              </p>
              <p style={{ margin: '5px 0' }}><strong>Recomendación:</strong> {recomendacion}</p>
              <p style={{ margin: '5px 0' }}><strong>Patrón:</strong> {registro.patron} | <strong>Tipo:</strong> {registro.tipo}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
