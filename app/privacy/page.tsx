export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background py-16 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">Política de Privacidade</h1>
                    <p className="text-muted-foreground text-lg">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-foreground/90">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground">1. Introdução</h2>
                        <p>
                            A sua privacidade é importante para nós. É política do <strong>Budget Monitor</strong> respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site <a href="#" className="text-primary hover:underline">Budget Monitor</a>, e outros sites que possuímos e operamos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">2. Informações que Coletamos</h2>
                        <p>
                            Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>Dados de Conta:</strong> Nome, e-mail e foto do perfil para identificação.</li>
                            <li><strong>Dados de Integração:</strong> Ao conectar contas do Google Ads ou Meta Ads, coletamos tokens de acesso e IDs de contas de anúncio para exibir métricas de desempenho. <strong>Não armazenamos dados sensíveis de pagamento ou cartões de crédito.</strong></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">3. Uso de Dados do Usuário</h2>
                        <p>
                            Utilizamos os dados coletados para:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Fornecer e manter nosso serviço de monitoramento de orçamento;</li>
                            <li>Notificá-lo sobre alterações no serviço ou no status de suas campanhas;</li>
                            <li>Permitir funcionalidades interativas do sistema;</li>
                            <li>Fornecer suporte ao cliente.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">4. Retenção de Dados</h2>
                        <p>
                            Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">5. Compartilhamento de Dados</h2>
                        <p>
                            Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei. Dados agregados e anonimizados podem ser usados para fins estatísticos.
                        </p>
                        <p className="mt-2">
                            Nosso site pode ter links para sites externos (como Google e Meta) que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">6. Exclusão de Dados</h2>
                        <p>
                            Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados. Usuários podem solicitar a exclusão completa de seus dados e revogação de tokens de acesso a qualquer momento através do painel de controle ou entrando em contato com nosso suporte.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">7. Dados do Facebook / Meta</h2>
                        <p>
                            Em conformidade com os termos da Meta, informamos que os dados obtidos através das APIs do Facebook são utilizados estritamente para a exibição de relatórios de desempenho e monitoramento de gastos.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">8. Compromisso do Usuário</h2>
                        <p>
                            O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o Budget Monitor oferece no site e com caráter enunciativo, mas não limitativo:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>A) Não se envolver em atividades que sejam ilegais ou contrárias à boa fé a à ordem pública;</li>
                            <li>B) Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, ou azar, qualquer tipo de pornografia ilegal, de apologia ao terrorismo ou contra os direitos humanos;</li>
                            <li>C) Não causar danos aos sistemas físicos (hardwares) e lógicos (softwares) do Budget Monitor, de seus fornecedores ou terceiros.</li>
                        </ul>
                    </section>
                </div>

                <div className="pt-8 border-t border-border">
                    <p className="text-center text-muted-foreground text-sm">
                        Esta política é efetiva a partir de <strong>Jan/{new Date().getFullYear()}</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
