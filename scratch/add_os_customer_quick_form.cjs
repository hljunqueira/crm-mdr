const fs = require('fs');
const path = require('path');

const osPath = path.join(__dirname, '../src/pages/ServiceOrders.tsx');
let content = fs.readFileSync(osPath, 'utf8');

// Normalize line endings to LF to ensure string search works perfectly
content = content.replace(/\r\n/g, '\n');

// 1. Update useCustomerStore destructuring
const targetStoreDestructure = `  const { customers, fetchCustomers } = useCustomerStore();`;
const replacementStoreDestructure = `  const { customers, fetchCustomers, addCustomer } = useCustomerStore();`;

if (content.includes(targetStoreDestructure)) {
  content = content.replace(targetStoreDestructure, replacementStoreDestructure);
  console.log("useCustomerStore destructuring updated.");
} else {
  console.error("Target useCustomerStore destructuring not found!");
  process.exit(1);
}

// 2. Add state hook variables
const targetStateHook = `  const [isCreateOpen, setIsCreateOpen] = useState(false);`;
const replacementStateHook = `  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', cpf: '', phone: '' });
  const [isLoadingQuickCustomer, setIsLoadingQuickCustomer] = useState(false);`;

if (content.includes(targetStateHook)) {
  content = content.replace(targetStateHook, replacementStateHook);
  console.log("Quick customer state variables added.");
} else {
  console.error("Target state hook not found!");
  process.exit(1);
}

// 3. Add handleQuickCreateCustomer function after OS selection useEffect
const targetEffect = `  useEffect(() => {
    if (selectedOsId) {
      fetchServiceOrderById(selectedOsId);
      setIsEditingReportedIssue(false);
    }
  }, [selectedOsId, fetchServiceOrderById]);`;

const replacementEffect = `  useEffect(() => {
    if (selectedOsId) {
      fetchServiceOrderById(selectedOsId);
      setIsEditingReportedIssue(false);
    }
  }, [selectedOsId, fetchServiceOrderById]);

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCustomer.name || !quickCustomer.cpf || !quickCustomer.phone) {
      showNotification('error', 'Erro', 'Todos os campos são obrigatórios.');
      return;
    }
    
    setIsLoadingQuickCustomer(true);
    try {
      const cleanCpf = quickCustomer.cpf.replace(/\\D/g, '');
      
      const existing = customers.find(c => c.cpf.replace(/\\D/g, '') === cleanCpf);
      if (existing) {
        showNotification('error', 'Erro', 'Já existe um cliente cadastrado com este CPF.');
        setIsLoadingQuickCustomer(false);
        return;
      }

      await addCustomer({
        name: quickCustomer.name,
        cpf: cleanCpf,
        phone: quickCustomer.phone.replace(/\\D/g, ''),
        address: '',
        status: 'active',
        classification: 'BOM',
        credit_status: 'APROVADO',
        registration_status: 'APROVADO',
        approved_for_purchase: true,
        unit_id: profile?.unit_id || undefined
      });

      await fetchCustomers(profile?.unit_id || undefined);

      const createdCustomer = useCustomerStore.getState().customers.find(
        c => c.cpf.replace(/\\D/g, '') === cleanCpf
      );

      if (createdCustomer) {
        setNewOs(prev => ({ ...prev, customer_id: createdCustomer.id }));
        showNotification('success', 'Sucesso', 'Cliente cadastrado e selecionado com sucesso!');
      } else {
        showNotification('success', 'Sucesso', 'Cliente cadastrado com sucesso!');
      }

      setQuickCustomer({ name: '', cpf: '', phone: '' });
      setIsQuickCustomerOpen(false);
    } catch (error) {
      showNotification('error', 'Erro', error?.response?.data?.message || 'Falha ao cadastrar cliente.');
    } finally {
      setIsLoadingQuickCustomer(false);
    }
  };`;

if (content.includes(targetEffect)) {
  content = content.replace(targetEffect, replacementEffect);
  console.log("handleQuickCreateCustomer function added.");
} else {
  console.error("Target useEffect not found!");
  process.exit(1);
}

// 4. Inject search button link below the search field
const targetSearchField = `                  <input
                    type="text"
                    placeholder="Pesquisar cliente por nome ou CPF..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display text-white"
                  />
                </div>`;

const replacementSearchField = `                  <input
                    type="text"
                    placeholder="Pesquisar cliente por nome ou CPF..."
                    value={customerSearchTerm}
                    onChange={(e) => setCustomerSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl pl-10 pr-4 py-3 text-xs focus:border-white outline-none transition-all font-display text-white"
                  />
                </div>
                {/* Link for simple registration */}
                <div className="flex justify-between items-center px-1">
                  <button
                    type="button"
                    onClick={() => setIsQuickCustomerOpen(true)}
                    className="text-[10px] text-primary hover:text-white font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} className="shrink-0" /> Não encontrou? Adicione o cliente no cadastro simples
                  </button>
                </div>`;

if (content.includes(targetSearchField)) {
  content = content.replace(targetSearchField, replacementSearchField);
  console.log("Search button link injected.");
} else {
  console.error("Target search field not found!");
  process.exit(1);
}

// 5. Append quick customer modal markup at the end of the file
const targetBottomLine = `      {/* MODAL DE ASSINATURA ELETRÔNICA */}
      {signatureMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <SignatureCanvas
              title={signatureMode === 'entry' ? "Assinatura de Entrada do Cliente" : "Assinatura de Retirada do Cliente"}
              onCancel={() => setSignatureMode(null)}
              onSave={async (base64) => {
                if (!currentServiceOrder) return;
                try {
                  if (signatureMode === 'entry') {
                    await updateServiceOrder(currentServiceOrder.id, { signature_entry: base64 });
                  } else {
                    await updateServiceOrder(currentServiceOrder.id, { signature_exit: base64 });
                  }
                  showNotification('success', 'Assinatura Registrada', 'Rubrica salva e vinculada à OS!');
                  setSignatureMode(null);
                } catch (err) {
                  showNotification('error', 'Erro ao salvar assinatura');
                }
              }}
            />
          </div>
        </div>
      )}

    </div>`;

const replacementBottomLine = `      {/* MODAL DE ASSINATURA ELETRÔNICA */}
      {signatureMode && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <SignatureCanvas
              title={signatureMode === 'entry' ? "Assinatura de Entrada do Cliente" : "Assinatura de Retirada do Cliente"}
              onCancel={() => setSignatureMode(null)}
              onSave={async (base64) => {
                if (!currentServiceOrder) return;
                try {
                  if (signatureMode === 'entry') {
                    await updateServiceOrder(currentServiceOrder.id, { signature_entry: base64 });
                  } else {
                    await updateServiceOrder(currentServiceOrder.id, { signature_exit: base64 });
                  }
                  showNotification('success', 'Assinatura Registrada', 'Rubrica salva e vinculada à OS!');
                  setSignatureMode(null);
                } catch (err) {
                  showNotification('error', 'Erro ao salvar assinatura');
                }
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO RÁPIDO DE CLIENTE */}
      {isQuickCustomerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-outline-variant/30 w-full max-w-md rounded-[32px] p-6 space-y-6 animate-in zoom-in duration-300 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Cadastro Rápido de Cliente</h3>
                <p className="text-[8px] text-on-surface-variant uppercase tracking-widest">Insira os dados essenciais para o atendimento</p>
              </div>
              <button 
                onClick={() => {
                  setQuickCustomer({ name: '', cpf: '', phone: '' });
                  setIsQuickCustomerOpen(false);
                }}
                className="text-on-surface-variant hover:text-white transition-all text-lg font-black"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-4 text-xs">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={quickCustomer.name}
                  onChange={(e) => setQuickCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">CPF</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={quickCustomer.cpf}
                    onChange={(e) => setQuickCustomer(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-on-surface/60 uppercase tracking-widest pl-1">Celular / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="(00) 00000-0000"
                    value={quickCustomer.phone}
                    onChange={(e) => setQuickCustomer(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    className="w-full bg-white/5 border border-outline-variant/30 rounded-2xl px-4 py-3.5 text-xs text-white focus:border-primary outline-none transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setQuickCustomer({ name: '', cpf: '', phone: '' });
                    setIsQuickCustomerOpen(false);
                  }}
                  className="flex-1 py-3.5 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoadingQuickCustomer}
                  className="flex-1 py-3.5 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-[9px] hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoadingQuickCustomer ? (
                    <>
                      <Loader2 size={12} className="animate-spin" /> Salvando...
                    </>
                  ) : (
                    'Cadastrar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>`;

if (content.includes(targetBottomLine)) {
  content = content.replace(targetBottomLine, replacementBottomLine);
  console.log("Quick customer modal appended.");
} else {
  console.error("Target bottom line block not found!");
  process.exit(1);
}

fs.writeFileSync(osPath, content, 'utf8');
console.log("ServiceOrders.tsx adjusted successfully.");
