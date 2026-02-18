'use client';

export default function GoogleSuccessPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center p-8 bg-white rounded-2xl shadow-lg max-w-md w-full border border-gray-100">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Conectado com Sucesso!</h1>
                <p className="text-gray-600 mb-8">
                    A integração com o Google Ads foi realizada. Você pode fechar esta janela e voltar para o sistema.
                </p>
                <button
                    onClick={() => window.close()}
                    className="px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-black transition-colors"
                >
                    Fechar Janela
                </button>
            </div>
        </div>
    );
}
