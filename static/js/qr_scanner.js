document.addEventListener('DOMContentLoaded', function() {
    // Elementos DOM
    const video = document.getElementById('qr-video');
    const videoContainer = document.getElementById('video-container');
    const canvasElement = document.getElementById('qr-canvas');
    const canvas = canvasElement.getContext('2d');
    const startButton = document.getElementById('start-scanner');
    const stopButton = document.getElementById('stop-scanner');
    const verifyButton = document.getElementById('verify-qr');
    const useButton = document.getElementById('use-qr');
    const qrResult = document.getElementById('qr-result');
    const resultMessage = document.getElementById('result-message');
    const resultTitle = document.getElementById('result-title');
    const ticketDetails = document.getElementById('ticket-details');
    const ticketData = document.getElementById('ticket-data');
    const qrInput = document.getElementById('qr-input');
    const verifyManual = document.getElementById('verify-manual');

    // Variables
    let scanning = false;
    let currentQrCode = null;
    let lastDetectedQrCode = null;
    let videoStream = null;
    let scanInterval = null;

    // Función para iniciar la cámara
    startButton.addEventListener('click', function() {
        startScanner();
    });

    // Función para detener la cámara
    stopButton.addEventListener('click', function() {
        stopScanner();
    });

    // Verificar QR escaneado
    verifyButton.addEventListener('click', function() {
        if (currentQrCode) {
            verifyQrCode(currentQrCode);
        }
    });

    // Usar QR escaneado
    useButton.addEventListener('click', function() {
        if (currentQrCode) {
            useQrCode(currentQrCode);
        }
    });

    // Verificar QR ingresado manualmente
    verifyManual.addEventListener('click', function() {
        const manualQrCode = qrInput.value.trim();
        if (manualQrCode) {
            currentQrCode = manualQrCode;
            verifyQrCode(manualQrCode);
            verifyButton.disabled = false;
            useButton.disabled = false;
        }
    });

    // Iniciar el escáner
    async function startScanner() {
        stopScanner(); // Por si acaso hay uno activo
        try {
            videoStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            video.srcObject = videoStream;
            videoContainer.style.display = 'block';
            startButton.disabled = true;
            stopButton.disabled = false;
            scanning = true;
            verifyButton.disabled = true;
            useButton.disabled = true;
            lastDetectedQrCode = null;
            qrResult.style.display = 'none';

            // Usamos setInterval en vez de requestAnimationFrame para controlar el frame rate de escaneo (más rápido y evita saturar)
            scanInterval = setInterval(scanFrame, 120); // 120 ms = ~8 fps
        } catch (error) {
            console.error("Error al acceder a la cámara:", error);
            showMessage("Error al acceder a la cámara. Asegúrate de dar permisos.", "error");
        }
    }

    // Detener el escáner
    function stopScanner() {
        if (scanInterval) {
            clearInterval(scanInterval);
            scanInterval = null;
        }
        if (videoStream) {
            videoStream.getTracks().forEach(track => track.stop());
            videoStream = null;
        }
        videoContainer.style.display = 'none';
        startButton.disabled = false;
        stopButton.disabled = true;
        scanning = false;
        verifyButton.disabled = true;
        useButton.disabled = true;
        currentQrCode = null;
        lastDetectedQrCode = null;
    }

    // Escaneo del frame
    function scanFrame() {
        if (!scanning) return;
        if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

        canvasElement.height = video.videoHeight;
        canvasElement.width = video.videoWidth;
        canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

        try {
            const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
                // Evita doble lectura del mismo código
                if (lastDetectedQrCode !== code.data) {
                    lastDetectedQrCode = code.data;
                    currentQrCode = code.data;
                    verifyButton.disabled = false;
                    useButton.disabled = false;

                    // Sonido de éxito
                    beep();

                    // Mostrar QR detectado
                    showMessage(`QR detectado: ${code.data}`, "info");
                }
            }
        } catch (err) {
            console.error("Error leyendo QR:", err);
        }
    }

    // Verificar código QR
    function verifyQrCode(qrCode) {
        fetch(`/scan/${qrCode}?verify=true`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "válido") {
                    showMessage(`${data.message}`, "success");
                    displayTicketInfo(data.ticket);
                } else {
                    showMessage(`${data.message}`, "error");
                    ticketDetails.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al verificar el código QR', "error");
            });
    }
    
    // Usar código QR
    function useQrCode(qrCode) {
        fetch(`/scan/${qrCode}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === "válido") {
                    showMessage(`${data.message}`, "success");
                    displayTicketInfo(data.ticket);
                } else {
                    showMessage(`${data.message}`, "error");
                    ticketDetails.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error al procesar el código QR', "error");
            });
    }
    
    // Mostrar mensaje de resultado
    function showMessage(message, type) {
        resultMessage.textContent = message;
        qrResult.style.display = 'block';
        
        // Remover clases anteriores
        qrResult.classList.remove('success-bg', 'error-bg');
        
        // Aplicar estilo según tipo de mensaje
        if (type === "success") {
            qrResult.classList.add('success-bg');
            resultTitle.textContent = "¡Éxito!";
        } else if (type === "error") {
            qrResult.classList.add('error-bg');
            resultTitle.textContent = "Error";
        } else {
            resultTitle.textContent = "Información";
        }
    }
    
    // Mostrar información del boleto
    function displayTicketInfo(ticket) {
        if (ticket) {
            ticketDetails.style.display = 'block';
            let html = `
                <p><strong>Boleto #:</strong> ${ticket.boleto}</p>
                <p><strong>Estado:</strong> ${ticket.usado ? 'Usado' : 'No usado'}</p>
                <p><strong>Tipo:</strong> ${ticket.vip ? 'VIP' : 'Normal'}</p>
            `;
            ticketData.innerHTML = html;
        } else {
            ticketDetails.style.display = 'none';
        }
    }
    
    // Sonido de beep al detectar QR
    function beep() {
        const beepSound = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU'+Array(1e3).join('A'));
        beepSound.play();
    }
});