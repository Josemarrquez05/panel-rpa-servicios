// ============================================
// SISTEMA DE AUTENTICACION SEGURA
// Panel RPA Servicios
// ============================================

const AUTH = {
    // Contrasenas hasheadas con SHA-256
    users: {
        'admin': '04445e6487736590d1ef50186b414e737e0164683cbbec64e00e73c000fd3bef'
    },
    robots: {
        'admin': ['uber', 'rappi', 'didi', 'cloud']
    }
};

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
