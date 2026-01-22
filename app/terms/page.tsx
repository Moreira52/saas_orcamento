export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background py-16 px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">Termos de Serviço</h1>
                    <p className="text-muted-foreground text-lg">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                <div className="prose prose-gray dark:prose-invert max-w-none space-y-6 text-foreground/90">
                    <section>
                        <h2 className="text-2xl font-bold text-foreground">1. Termos</h2>
                        <p>
                            Ao acessar ao site <strong>Budget Monitor</strong>, concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis e concorda que é responsável pelo cumprimento de todas as leis locais aplicáveis. Se você não concordar com algum desses termos, está proibido de usar ou acessar este site. Os materiais contidos neste site são protegidos pelas leis de direitos autorais e marcas comerciais aplicáveis.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">2. Uso de Licença</h2>
                        <p>
                            É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no site Budget Monitor, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título e, sob esta licença, você não pode:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Modificar ou copiar os materiais;</li>
                            <li>Usar os materiais para qualquer finalidade comercial ou para exibição pública (comercial ou não comercial);</li>
                            <li>Tentar descompilar ou fazer engenharia reversa de qualquer software contido no site Budget Monitor;</li>
                            <li>Remover quaisquer direitos autorais ou outras notações de propriedade dos materiais; ou</li>
                            <li>Transferir os materiais para outra pessoa ou 'espelhe' os materiais em qualquer outro servidor.</li>
                        </ul>
                        <p className="mt-2">
                            Esta licença será automaticamente rescindida se você violar alguma dessas restrições e poderá ser rescindida por Budget Monitor a qualquer momento. Ao encerrar a visualização desses materiais ou após o término desta licença, você deve apagar todos os materiais baixados em sua posse, seja em formato eletrônico ou impresso.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">3. Isenção de responsabilidade</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Os materiais no site da Budget Monitor são fornecidos 'como estão'. Budget Monitor não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias, incluindo, sem limitação, garantias implícitas ou condições de comercialização, adequação a um fim específico ou não violação de propriedade intelectual ou outra violação de direitos.</li>
                            <li>Além disso, o Budget Monitor não garante ou faz qualquer representação relativa à precisão, aos resultados prováveis ou à confiabilidade do uso dos materiais em seu site ou de outra forma relacionado a esses materiais ou em sites vinculados a este site.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">4. Limitações</h2>
                        <p>
                            Em nenhum caso o Budget Monitor ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais em Budget Monitor, mesmo que Budget Monitor ou um representante autorizado da Budget Monitor tenha sido notificado oralmente ou por escrito da possibilidade de tais danos. Como algumas jurisdições não permitem limitações em garantias implícitas, ou limitações de responsabilidade por danos conseqüentes ou incidentais, essas limitações podem não se aplicar a você.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">5. Precisão dos materiais</h2>
                        <p>
                            Os materiais exibidos no site da Budget Monitor podem incluir erros técnicos, tipográficos ou fotográficos. Budget Monitor não garante que qualquer material em seu site seja preciso, completo ou atual. Budget Monitor pode fazer alterações nos materiais contidos em seu site a qualquer momento, sem aviso prévio. No entanto, Budget Monitor não se compromete a atualizar os materiais.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">6. Links</h2>
                        <p>
                            O Budget Monitor não analisou todos os sites vinculados ao seu site e não é responsável pelo conteúdo de nenhum site vinculado. A inclusão de qualquer link não implica endosso por Budget Monitor do site. O uso de qualquer site vinculado é por conta e risco do usuário.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">7. Modificações</h2>
                        <p>
                            O Budget Monitor pode revisar estes termos de serviço do site a qualquer momento, sem aviso prévio. Ao usar este site, você concorda em ficar vinculado à versão atual desses termos de serviço.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-foreground">8. Lei aplicável</h2>
                        <p>
                            Estes termos e condições são regidos e interpretados de acordo com as leis do Budget Monitor e você se submete irrevogavelmente à jurisdição exclusiva dos tribunais naquele estado ou localidade.
                        </p>
                    </section>
                </div>

                <div className="pt-8 border-t border-border">
                    <p className="text-center text-muted-foreground text-sm">
                        Estes termos são efetivos a partir de <strong>Jan/{new Date().getFullYear()}</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
