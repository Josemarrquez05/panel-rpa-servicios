// ============================================
// SISTEMA DE AUTENTICACION SEGURA
// Panel RPA Servicios
// ============================================

const AUTH = {
    // Contrasenas hasheadas con SHA-256
    users: {
        'servicios': '71b5a564ce86f337ed95ea4f8e8d1054ec4f0cf621f9c1a3ca6608b18fc97912'
    },
    robots: {
        'servicios': ['uber', 'rappi', 'didi', 'cloud']
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
