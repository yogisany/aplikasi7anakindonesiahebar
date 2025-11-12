
import { User } from '../types';

const API_BASE_URL = '/api'; // This would be your actual backend URL in production.

/**
 * A placeholder for making API requests to a real backend.
 * In a real-world application, this function would use fetch() to send requests
 * to a server and would handle things like authentication tokens, headers, and error responses.
 *
 * @param path The API endpoint path (e.g., '/users')
 * @param options The standard RequestInit options for fetch()
 * @returns A promise that resolves with the JSON response from the server.
 */
export const apiRequest = async (path: string, options: RequestInit = {}): Promise<any> => {
    // Log the intended request for debugging purposes.
    console.log(`[API Request] ==> ${options.method || 'GET'} ${API_BASE_URL}${path}`, options.body ? JSON.parse(options.body as string) : '');
    
    // Simulate network delay to mimic real-world conditions.
    await new Promise(res => setTimeout(res, 300));

    // --- MOCK BEHAVIOR FOR DEMONSTRATION ---
    // This section simulates a backend response. In a real application,
    // this would be replaced by an actual `fetch` call to your server.
    // It returns minimal data to allow UI navigation but does not persist anything.

    if (path.startsWith('/auth/login')) {
        const body = JSON.parse(options.body as string);
        // Mock login allows navigating the app as 'admin' or 'guru1' for demo purposes.
        if (body.username === 'admin' && body.password === 'password') {
            return {
                user: { id: 'admin01', name: 'Admin Utama', username: 'admin', role: 'admin' } as User
            };
        }
        if (body.username === 'guru1' && body.password === 'password') {
            return {
                user: { id: 'teacher01', name: 'Budi Hartono', username: 'guru1', role: 'teacher', kelas: 'Kelas 1A' } as User
            };
        }
        throw new Error('Username atau password salah.');
    }

    // For any GET request, return an empty array to prevent UI crashes on functions like .map().
    // The UI will appear empty, which is the expected behavior without a real backend.
    if (options.method === 'GET' || !options.method) {
        return [];
    }

    // For any data modification requests (POST, PUT, DELETE), return a generic success response.
    // The data is not actually saved anywhere.
    return { success: true, message: 'Operasi berhasil (respon tiruan).' };
};
