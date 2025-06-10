const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const horarioInicio = 7;
const horarioFin = 22;

const clases = [];

// Variables globales adicionales
const editModalBg = document.getElementById('editModalBg');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const editForm = document.getElementById('editClassForm');
const deleteClassBtn = document.getElementById('deleteClassBtn');
let selectedClassIndex = -1;
const scheduleTable = document.getElementById('scheduleTable');
const scheduleHeader = document.getElementById('scheduleHeader');
const scheduleBody = document.getElementById('scheduleBody');
const openModalBtn = document.getElementById('openModalBtn');
const modalBg = document.getElementById('modalBg');
const closeModalBtn = document.getElementById('closeModalBtn');
const form = document.getElementById('classForm');
const tooltip = document.getElementById('tooltip');

const clasesGuardadas = localStorage.getItem('clasesGuardadas');
if (clasesGuardadas) {
    try {
        const parsed = JSON.parse(clasesGuardadas);
        if (Array.isArray(parsed)) {
            clases.push(...parsed);
        }
    } catch (error) {
        console.error('Error al cargar clases desde localStorage:', error);
    }
}

function initScheduleTable() {
    // Crear encabezado con días
    scheduleHeader.innerHTML = '<th>Hora</th>';
    diasSemana.forEach(dia => {
        const th = document.createElement('th');
        th.textContent = dia;
        scheduleHeader.appendChild(th);
    });

    // Crear filas por hora con celdas vacías
    scheduleBody.innerHTML = '';
    for (let hora = horarioInicio; hora < horarioFin; hora++) {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.textContent = `${pad(hora)}:00`;
        tr.appendChild(th);

        for (let i = 0; i < diasSemana.length; i++) {
            const td = document.createElement('td');
            td.classList.add('td-container');
            // Añadimos atributos para luego encontrar celda con día y hora
            td.setAttribute('data-day-index', i);
            td.setAttribute('data-hour', hora);
            tr.appendChild(td);
        }
        scheduleBody.appendChild(tr);
    }
}

// Rellenar clases en tabla
function renderClases() {
    const tds = document.querySelectorAll('.td-container');
    tds.forEach(td => td.innerHTML = '');

    clases.forEach((clase, idx) => {
        clase.dias.forEach(dia => {
            const dayIndex = diasSemana.indexOf(dia);
            if (dayIndex === -1) return;

            const start = horaToDecimal(clase.horaInicio);
            const end = horaToDecimal(clase.horaFin);
            const startSlot = Math.floor(start);
            const duration = end - start; // Esta línea faltaba

            for (let hour = startSlot; hour < end; hour++) {
                const td = [...scheduleBody.querySelectorAll(`td.td-container[data-day-index="${dayIndex}"][data-hour="${hour}"]`)][0];
                if (!td) continue;

                if (hour === startSlot) {
                    const block = document.createElement('div');
                    block.classList.add('class-block');
                    block.classList.add(clase.modalidad.toLowerCase());
                    block.style.top = ((start - startSlot) * 60) + 'px';
                    block.style.height = (duration * 60) + 'px';
                    block.innerHTML = `
                    <strong>${clase.nombre}</strong>
                    <div>${clase.aula} • ${clase.profesor}</div>
                    <div class="class-time">${clase.horaInicio} - ${clase.horaFin}</div>
                `;
                    const tooltipText = `Profesor: ${clase.profesor}\nAula: ${clase.aula}\nModalidad: ${clase.modalidad}\nInicio: ${clase.horaInicio}\nFin: ${clase.horaFin}`;
                    block.dataset.tooltip = tooltipText;
                    block.dataset.classIndex = idx;

                    // Hacer la clase clickable para editar
                    block.addEventListener('click', (e) => {
                        selectedClassIndex = idx;
                        openEditModal(clase);
                    });

                    td.appendChild(block);
                }
            }
        });
    });
}

function horaToDecimal(hora) {
    const [hh, mm] = hora.split(':').map(Number);
    return hh + mm / 60;
}

function pad(n) {
    return n < 10 ? '0' + n : n;
}

openModalBtn.onclick = () => {
    modalBg.classList.add('active');
    form.reset();
};

closeModalBtn.onclick = () => {
    modalBg.classList.remove('active');
};

modalBg.onclick = e => {
    if (e.target === modalBg) {
        modalBg.classList.remove('active');
    }
};

// Función para abrir el modal de edición
function openEditModal(clase) {
    document.getElementById('editClassName').value = clase.nombre;
    document.getElementById('editAula').value = clase.aula;
    document.getElementById('editStartTime').value = clase.horaInicio;
    document.getElementById('editEndTime').value = clase.horaFin;
    document.getElementById('editProfesor').value = clase.profesor;
    document.getElementById('editModalidad').value = clase.modalidad;
    document.getElementById('editIndex').value = selectedClassIndex;

    // Resetear checkboxes
    document.querySelectorAll('input[name="editDays"]').forEach(checkbox => {
        checkbox.checked = clase.dias.includes(checkbox.value);
    });

    editModalBg.classList.add('active');
}

// Función para cerrar el modal de edición
closeEditModalBtn.onclick = () => {
    editModalBg.classList.remove('active');
};

editModalBg.onclick = e => {
    if (e.target === editModalBg) {
        editModalBg.classList.remove('active');
    }
};

// Manejar el formulario de edición
editForm.onsubmit = e => {
    e.preventDefault();

    const index = parseInt(document.getElementById('editIndex').value);
    const nombre = editForm.editClassName.value.trim();
    const dias = Array.from(editForm.editDays).filter(chk => chk.checked).map(chk => chk.value);
    const horaInicio = editForm.editStartTime.value;
    const horaFin = editForm.editEndTime.value;
    const profesor = editForm.editProfesor.value.trim();
    const modalidad = editForm.editModalidad.value;
    const aula = editForm.editAula.value.trim();

    if (dias.length === 0) {
        alert('Por favor, selecciona al menos un día.');
        return;
    }

    if (horaInicio >= horaFin) {
        alert('La hora de inicio debe ser menor que la hora de fin.');
        return;
    }

    const claseEditada = { nombre, dias, horaInicio, horaFin, profesor, modalidad, aula };

    // Validar choque de horario (excluyendo la clase actual que se está editando)
    const clasesParaValidar = clases.filter((_, i) => i !== index);
    const tieneChoque = clasesParaValidar.some(claseExistente => {
        const diasComunes = claseExistente.dias.some(dia => claseEditada.dias.includes(dia));
        if (!diasComunes) return false;

        const inicioExistente = horaToDecimal(claseExistente.horaInicio);
        const finExistente = horaToDecimal(claseExistente.horaFin);
        const inicioEditado = horaToDecimal(claseEditada.horaInicio);
        const finEditado = horaToDecimal(claseEditada.horaFin);

        return (
            (inicioEditado >= inicioExistente && inicioEditado < finExistente) ||
            (finEditado > inicioExistente && finEditado <= finExistente) ||
            (inicioEditado <= inicioExistente && finEditado >= finExistente)
        );
    });

    if (tieneChoque) {
        alert('Error: Existe un choque de horario con otra clase registrada.');
        return;
    }

    clases[index] = claseEditada;
    guardarEnLocalStorage
    editModalBg.classList.remove('active');
    renderClases();
  };

// Manejar el botón de eliminar
deleteClassBtn.onclick = () => {
    editModalBg.classList.remove('active'); // Cierra primero el modal de edición

    Swal.fire({
        title: '¿Eliminar clase?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        backdrop: 'rgba(0,0,0,0.7)',
        allowOutsideClick: false
    }).then((result) => {
        if (result.isConfirmed) {
            clases.splice(selectedClassIndex, 1);
            guardarEnLocalStorage();
            renderClases();

            Swal.fire({
                icon: 'success',
                title: 'Eliminado',
                text: 'La clase ha sido eliminada.',
            });
        } else {
            // Si cancela, volver a abrir el modal de edición
            editModalBg.classList.add('active');
        }
    });
};

// Modificar el submit del formulario principal
form.onsubmit = e => {
    e.preventDefault();

    const nombre = form.className.value.trim();
    const dias = Array.from(form.days).filter(chk => chk.checked).map(chk => chk.value);
    const horaInicio = form.startTime.value;
    const horaFin = form.endTime.value;
    const profesor = form.profesor.value.trim();
    const modalidad = form.modalidad.value;
    const aula = form.aula.value.trim();

    if (dias.length === 0) {
        Swal.fire({
            icon: 'warning',
            title: 'Faltan datos',
            text: 'Por favor, selecciona al menos un día.',
          });
        return;
    }

    if (horaInicio >= horaFin) {
        Swal.fire({
            icon: 'error',
            title: 'Horario inválido',
            text: 'La hora de inicio debe ser menor que la hora de fin.',
        });    
        return;
    }

    const nuevaClase = { nombre, dias, horaInicio, horaFin, profesor, modalidad, aula };

    // Validar choque de horario
    if (tieneChoqueHorario(nuevaClase)) {
        Swal.fire({
            icon: 'error',
            title: 'Choque de horario',
            text: 'Existe un choque de horario con otra clase registrada.',
          });
        return;
    }

    clases.push(nuevaClase);
    guardarEnLocalStorage();
    modalBg.classList.remove('active');
    renderClases();
  };

// Función para verificar choques de horario
function tieneChoqueHorario(nuevaClase) {
    return clases.some(claseExistente => {
        // Verificar si hay días en común
        const diasComunes = claseExistente.dias.some(dia => nuevaClase.dias.includes(dia));
        if (!diasComunes) return false;

        // Convertir horas a formato decimal para comparación
        const inicioExistente = horaToDecimal(claseExistente.horaInicio);
        const finExistente = horaToDecimal(claseExistente.horaFin);
        const inicioNuevo = horaToDecimal(nuevaClase.horaInicio);
        const finNuevo = horaToDecimal(nuevaClase.horaFin);

        // Verificar solapamiento de horarios
        return (
            (inicioNuevo >= inicioExistente && inicioNuevo < finExistente) || // Nuevo inicio dentro de existente
            (finNuevo > inicioExistente && finNuevo <= finExistente) ||       // Nuevo fin dentro de existente
            (inicioNuevo <= inicioExistente && finNuevo >= finExistente)      // Nuevo contiene existente
        );
    });
  }

function guardarEnLocalStorage() {
    localStorage.setItem('clasesGuardadas', JSON.stringify(clases));
}
// Inicializar tabla y renderizar
initScheduleTable();
renderClases();
