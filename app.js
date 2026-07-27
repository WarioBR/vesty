/* ============================================================
   InvestidorBR — app.js — Engine Principal Premium
   Módulos: Mercado Ao Vivo · Simulador · Carteira · Ferramentas
            · Automação Gemini · Alertas · PWA · Calculadoras
   ============================================================ */

'use strict';

// ===================== CONFIGURAÇÃO =====================

const CFG = {
  UPDATE_INTERVAL: 60_000,   // Atualizar mercado a cada 60s
  ALERT_CHECK:     120_000,  // Verificar alertas a cada 2min
  GEMINI_MODEL:    'gemini-2.0-flash',
  GEMINI_URL:      'https://generativelanguage.googleapis.com/v1beta/models/',
};

// ===================== ESTADO GLOBAL =====================

let STATE = {
  mercadoData:  [],
  geminiKey:    localStorage.getItem('ibr_gemini_key') || '',
  alertas:      JSON.parse(localStorage.getItem('ibr_alertas') || '[]'),
  perfilAtual:  'conservador',
  dicaIndex:    0,
  marketTimer:  null,
  alertTimer:   null,
  pwaPrompt:    null,
  chartSim:     null,
  chartHero:    null,
  chartCart:    null,
};

// ===================== DADOS ESTÁTICOS =====================

const PERFIS = {
  conservador: {
    label: 'Conservador',
    emoji: '🛡️',
    cores: ['#00D09C','#00A87E','#3b82f6','#6366f1','#22d3ee'],
    ativos: [
      { nome:'Tesouro Selic',    tipo:'Renda Fixa',     icon:'🏛️', pct:35 },
      { nome:'CDB Liquidez',     tipo:'Renda Fixa',     icon:'🏦', pct:25 },
      { nome:'LCI/LCA',          tipo:'Renda Fixa',     icon:'🌾', pct:20 },
      { nome:'Tesouro IPCA+',    tipo:'Renda Fixa',     icon:'📊', pct:15 },
      { nome:'Fundo RF DI',      tipo:'Fundo',          icon:'💼', pct:5  },
    ]
  },
  moderado: {
    label: 'Moderado',
    emoji: '⚖️',
    cores: ['#F0A500','#00D09C','#3b82f6','#22c55e','#6366f1'],
    ativos: [
      { nome:'Tesouro IPCA+',    tipo:'Renda Fixa',     icon:'📊', pct:30 },
      { nome:'CDB/LCI',          tipo:'Renda Fixa',     icon:'🏦', pct:20 },
      { nome:'FII (Fundos Imob)',tipo:'Renda Variável',  icon:'🏢', pct:20 },
      { nome:'Ações Brasil',     tipo:'Renda Variável',  icon:'📈', pct:20 },
      { nome:'ETF Global/BDR',   tipo:'Exterior',        icon:'🌍', pct:10 },
    ]
  },
  arrojado: {
    label: 'Arrojado',
    emoji: '🚀',
    cores: ['#FF4757','#F0A500','#00D09C','#7c3aed','#0891b2'],
    ativos: [
      { nome:'Ações Brasil',     tipo:'Renda Variável',  icon:'📈', pct:35 },
      { nome:'ETFs Globais',     tipo:'Exterior',        icon:'🌍', pct:20 },
      { nome:'FIIs',             tipo:'Renda Variável',  icon:'🏢', pct:15 },
      { nome:'Cripto (BTC/ETH)',tipo:'Digital',          icon:'₿',  pct:15 },
      { nome:'IPCA+ Curto',      tipo:'Renda Fixa',      icon:'🛡️', pct:15 },
    ]
  },
  trader: {
    label: 'Trader',
    emoji: '⚡',
    cores: ['#FF4757','#7c3aed','#F0A500','#00D09C','#ec4899'],
    ativos: [
      { nome:'Ações Ativas',    tipo:'Day/Swing Trade',  icon:'📈', pct:40 },
      { nome:'Mini Contratos',  tipo:'Derivativos',      icon:'⚡', pct:25 },
      { nome:'Cripto Altcoins', tipo:'Digital',          icon:'🔥', pct:20 },
      { nome:'Opções',          tipo:'Derivativos',      icon:'🎯', pct:10 },
      { nome:'Caixa/RF',        tipo:'Proteção',         icon:'🛡️', pct:5  },
    ]
  }
};

const FERRAMENTAS = {
  corretoras: [
    { nome:'XP Investimentos', icon:'🏦', cat:'Corretora',
      desc:'A maior corretora independente do Brasil. Assessoria especializada e mais de 700 produtos.',
      tags:['Ações','FIIs','Renda Fixa','Fundos','BDR'],
      url:'https://xpi.com.br',
      modal:{
        pros:['Maior plataforma de investimentos','Assessoria personalizada','+700 fundos disponíveis','App moderno e robusto','Carteiras automáticas XP'],
        contras:['Taxa de custódia para pequenos valores','Curva de aprendizado alta para iniciantes'],
        ideal:'Investidores que buscam variedade e assessoria profissional.',
        minimo:'R$ 0 — sem valor mínimo'
      }
    },
    { nome:'Rico', icon:'💚', cat:'Corretora',
      desc:'Corretora digital com zero de taxa de corretagem. Ideal para quem está começando.',
      tags:['Taxa Zero','Renda Fixa','Ações','ETFs'],
      url:'https://rico.com.vc',
      modal:{
        pros:['Zero taxa de corretagem','Interface simples','Forte em Tesouro Direto','Ótimo para iniciantes'],
        contras:['Menos produtos que grandes corretoras','Suporte pode ser lento'],
        ideal:'Iniciantes e pequenos investidores.',
        minimo:'R$ 0 — comece com qualquer valor'
      }
    },
    { nome:'Inter Invest', icon:'🧡', cat:'Corretora',
      desc:'Banco e corretora integrados. Invista direto da conta sem transferências, com cashback.',
      tags:['Banco+Corretora','Cashback','CDB','Ações'],
      url:'https://inter.co',
      modal:{
        pros:['Banco + investimentos integrado','Cashback em compras','Sem taxas para Tesouro','App excelente'],
        contras:['Menos fundos que XP','Assessoria limitada'],
        ideal:'Quem já usa o Banco Inter e quer centralizar tudo.',
        minimo:'R$ 1 — aberta para todos'
      }
    },
    { nome:'BTG Pactual', icon:'🔵', cat:'Corretora',
      desc:'Braço digital do maior banco de investimentos da América Latina. Alta qualidade.',
      tags:['Private','CRI/CRA','Debêntures','Global'],
      url:'https://btgpactual.com',
      modal:{
        pros:['Melhor banco de investimentos do Brasil','Produtos exclusivos','Gestão de patrimônio completa','Acesso global'],
        contras:['Foco em maior patrimônio','Menos amigável para iniciantes'],
        ideal:'Investidores de maior patrimônio.',
        minimo:'R$ 0 — conta digital gratuita'
      }
    },
    { nome:'Nubank/NuInvest', icon:'💜', cat:'Corretora',
      desc:'A fintech mais famosa do Brasil + corretora. Invista direto pelo app do roxinho.',
      tags:['Simples','CDB','Tesouro','ETF'],
      url:'https://nubank.com.br',
      modal:{
        pros:['App excelente e simples','Zero burocracia','Integração total Nubank','Ótimo para renda fixa'],
        contras:['Menos opções de renda variável','Sem assessoria especializada'],
        ideal:'Cliente Nubank dando o 1º passo nos investimentos.',
        minimo:'R$ 1'
      }
    },
    { nome:'Clear Corretora', icon:'⚡', cat:'Corretora',
      desc:'Especializada em day trade e operações ativas. Corretagem zero e plataforma profissional.',
      tags:['Day Trade','Zero taxa','Mini Contratos','Swing'],
      url:'https://clear.com.br',
      modal:{
        pros:['Zero corretagem','Plataforma profissional','Mini-contratos acessíveis','Alta confiabilidade'],
        contras:['Foco em traders ativos','Menos renda fixa'],
        ideal:'Traders e investidores ativos no mercado de ações.',
        minimo:'R$ 0'
      }
    },
  ],
  'robos-c': [
    { nome:'Warren', icon:'🤖', cat:'Robô Consultor',
      desc:'Primeiro robô-consultor do Brasil. Carteiras automáticas baseadas no seu perfil.',
      tags:['Automático','Perfil','Rebalanceamento','Fundos'],
      url:'https://oiwarren.com',
      modal:{
        pros:['Gestão automática','Rebalanceamento automático','Interface linda','Ótimo para quem não tem tempo'],
        contras:['Taxa de gestão anual','Menos flexível'],
        ideal:'Investidores que querem delegar a gestão.',
        minimo:'R$ 50'
      }
    },
    { nome:'Magnetis', icon:'🧲', cat:'Robô Consultor',
      desc:'Gestora digital que monta e cuida da sua carteira automaticamente com foco em ETFs.',
      tags:['Gestão Auto','ETF','Baixo Custo','Metas'],
      url:'https://magnetis.com.br',
      modal:{
        pros:['Carteira totalmente automática','ETFs de baixo custo','Excelentes relatórios','Orientado a metas'],
        contras:['Menos controle individual'],
        ideal:'Longo prazo com crescimento passivo.',
        minimo:'R$ 1.000'
      }
    },
    { nome:'Vérios', icon:'🧬', cat:'Robô Consultor',
      desc:'Gestão automática baseada em evidências científicas e alocação eficiente de mercado.',
      tags:['Científico','Diversificação','ETF','Evidências'],
      url:'https://verios.com.br',
      modal:{
        pros:['Base acadêmica sólida','Diversificação excelente','Transparência total'],
        contras:['Menos conhecido','Interface simples'],
        ideal:'Investidores que valorizam base científica.',
        minimo:'R$ 1.000'
      }
    },
    { nome:'Carteiras Auto XP', icon:'📦', cat:'Robô Consultor',
      desc:'Carteiras gerenciadas automaticamente pela XP com estratégias por especialistas.',
      tags:['XP','Automático','Estratégias','Especialistas'],
      url:'https://xpi.com.br',
      modal:{
        pros:['Poder da XP com automação','Diversas estratégias','Rebalanceamento automático','Suporte especializado'],
        contras:['Taxas maiores','Dependente da XP'],
        ideal:'Clientes XP que querem automatizar.',
        minimo:'R$ 5.000'
      }
    },
  ],
  'robos-t': [
    { nome:'SmarttBot', icon:'⚡', cat:'Robô Trader',
      desc:'Líder em robôs para a B3. Conecte estratégias automatizadas direto nas corretoras.',
      tags:['B3','Automação','Mini-Índice','Mini-Dólar'],
      url:'https://smarttbot.com',
      modal:{
        pros:['Maior marketplace de robôs do Brasil','Integração direta com corretoras','Backtesting histórico','Vários robôs disponíveis'],
        contras:['Requer conhecimento de mercado','Assinatura mensal'],
        ideal:'Traders que querem automatizar mini-contratos na B3.',
        minimo:'R$ 300/mês + capital'
      }
    },
    { nome:'Tryd', icon:'🎯', cat:'Robô Trader',
      desc:'Plataforma profissional de automação de estratégias para renda variável.',
      tags:['Estratégias','Professional','Backtesting','RV'],
      url:'https://tryd.com.br',
      modal:{
        pros:['Plataforma profissional','Backtesting excelente','Alta customização'],
        contras:['Mais técnico','Curva de aprendizado alta'],
        ideal:'Traders profissionais e quantitativos.',
        minimo:'R$ 200/mês'
      }
    },
    { nome:'Trade System', icon:'🤖', cat:'Robô Trader',
      desc:'Crie, teste e rode suas estratégias em ações, futuros e opções automaticamente.',
      tags:['Ações','Futuros','Opções','Custom'],
      url:'https://tradesystem.com.br',
      modal:{
        pros:['Crie sua estratégia','Multi-ativos','Comunidade ativa','Backtesting robusto'],
        contras:['Requer programação','Interface densa'],
        ideal:'Desenvolvedores de estratégias quant.',
        minimo:'R$ 150/mês'
      }
    },
    { nome:'Profit Pro', icon:'💹', cat:'Robô Trader',
      desc:'Plataforma completa da Nelogica com automação integrada. Referência dos profissionais.',
      tags:['Nelogica','Professional','API','DDE'],
      url:'https://nelogica.com.br',
      modal:{
        pros:['Referência no mercado','Altamente estável','API e DDE','Amplitude de ativos'],
        contras:['Custo elevado','Interface menos moderna'],
        ideal:'Traders profissionais e mesas de operação.',
        minimo:'R$ 350/mês'
      }
    },
  ],
  consolidadores: [
    { nome:'Gorila', icon:'🦍', cat:'Consolidador',
      desc:'Consolide todos os seus investimentos em um painel. Conecta com +100 corretoras.',
      tags:['Multi-corretora','Dashboard','IR','Rentabilidade'],
      url:'https://gorila.com.br',
      modal:{
        pros:['+100 corretoras conectadas','Cálculo automático de IR','Dashboard completo','Básico gratuito'],
        contras:['Plano pago para avançado'],
        ideal:'Quem tem investimentos em várias corretoras.',
        minimo:'Gratuito / R$ 29,90/mês premium'
      }
    },
    { nome:'Kinvo', icon:'🐙', cat:'Consolidador',
      desc:'App de controle financeiro + consolidador com interface visual incrível.',
      tags:['App','Visual','Multi-ativo','Metas'],
      url:'https://kinvo.com.br',
      modal:{
        pros:['Interface belíssima','Multi-ativo e corretora','Metas de investimento','Heatmap de carteira'],
        contras:['Integrações manuais pontuais'],
        ideal:'Quem quer visualizar a carteira de forma premium.',
        minimo:'R$ 19,90/mês'
      }
    },
    { nome:'Meu Portfólio', icon:'📋', cat:'Consolidador',
      desc:'Ferramenta gratuita de portfólio com dados reais da B3.',
      tags:['Gratuito','B3','Ações','FIIs'],
      url:'https://meuportfolio.digital',
      modal:{
        pros:['100% gratuito','Dados em tempo real da B3','Simples e direto'],
        contras:['Funcionalidades básicas'],
        ideal:'Investidores de ações e FIIs.',
        minimo:'Grátis'
      }
    },
    { nome:'Status Invest', icon:'📊', cat:'Consolidador',
      desc:'Maior plataforma de análise de FIIs, Ações e Renda Fixa do Brasil.',
      tags:['Análise','FIIs','Ações','Gratuito'],
      url:'https://statusinvest.com.br',
      modal:{
        pros:['Melhor análise de FIIs','Top em dividendos','Gratuito e completo','Comunidade enorme'],
        contras:['Foco em análise, não em carteira'],
        ideal:'Investidores que fazem análise fundamentalista.',
        minimo:'Grátis'
      }
    },
  ],
  analise: [
    { nome:'Status Invest', icon:'📊', cat:'Análise Fundamentalista',
      desc:'A plataforma mais completa para análise de FIIs, ações e renda fixa do Brasil.',
      tags:['FIIs','Dividendos','P/L','P/VP'],
      url:'https://statusinvest.com.br',
      modal:{
        pros:['Análise fundamentalista completa','DY histórico','Comparativo de ativos','Filtros avançados'],
        contras:['Sem integração com corretoras'],
        ideal:'Investidores fundamentalistas em ações e FIIs.',
        minimo:'Grátis'
      }
    },
    { nome:'Fundamentus', icon:'🔍', cat:'Análise Fundamentalista',
      desc:'Dados fundamentalistas de ações da B3. Ferramenta gratuita e completa.',
      tags:['B3','Indicadores','Balanço','DRE'],
      url:'https://fundamentus.com.br',
      modal:{
        pros:['Todos os indicadores fundamentalistas','Rápido e direto','Gratuito'],
        contras:['Interface datada','Sem FIIs'],
        ideal:'Análise rápida de indicadores de ações.',
        minimo:'Grátis'
      }
    },
    { nome:'Investidor10', icon:'💡', cat:'Análise',
      desc:'Plataforma completa com carteiras de influenciadores e análises premium.',
      tags:['Carteiras','Influenciadores','FIIs','Ações'],
      url:'https://investidor10.com.br',
      modal:{
        pros:['Carteiras de referência','Rankings de FIIs','Interface moderna','Comunidade ativa'],
        contras:['Plano pago para mais recursos'],
        ideal:'Investidores que querem referências de carteiras.',
        minimo:'Grátis (básico)'
      }
    },
    { nome:'TradingView', icon:'📉', cat:'Análise Técnica',
      desc:'A maior plataforma mundial de gráficos e análise técnica de ativos.',
      tags:['Gráficos','Indicadores','B3','Global'],
      url:'https://tradingview.com',
      modal:{
        pros:['Melhor plataforma de gráficos','Indicadores infinitos','Comunidade global de ideias','Alertas de preço'],
        contras:['Plano pago para mais indicadores'],
        ideal:'Analistas técnicos e traders.',
        minimo:'Grátis (básico)'
      }
    },
  ]
};

const DICAS = [
  { icon:'🧠', cat:'Psicologia', text:'Nunca invista dinheiro que você pode precisar nos próximos 12 meses. O mercado de curto prazo é imprevisível. Poupança de emergência vem sempre primeiro.' },
  { icon:'📅', cat:'Estratégia', text:'Aportes mensais constantes (DCA — Dollar Cost Averaging) historicamente superam tentar acertar o "melhor momento" para investir. Consistência bate timing.' },
  { icon:'🌍', cat:'Diversificação', text:'A melhor carteira não é a de maior retorno passado — é a mais resiliente. Distribua entre renda fixa, variável e ativos internacionais para reduzir risco sem abrir mão do retorno.' },
  { icon:'💡', cat:'Fundamentos', text:'O preço que você paga determina seu retorno futuro. Um ótimo ativo comprado caro pode ser um péssimo investimento. Margem de segurança é tudo.' },
  { icon:'📊', cat:'Macro', text:'A Selic alta beneficia a renda fixa pós-fixada. Em ciclos de queda, a renda fixa pré-fixada e títulos IPCA+ de longo prazo tendem a se valorizar mais. Monitore o ciclo.' },
  { icon:'🏢', cat:'FIIs', text:'Fundos Imobiliários (FIIs) pagam rendimentos mensais isentos de IR para pessoa física. São uma excelente forma de ter renda passiva com liquidez diária.' },
  { icon:'🌱', cat:'Juros Compostos', text:'Einstein chamou os juros compostos de "a 8ª maravilha do mundo". Começar 10 anos antes pode significar 3× mais patrimônio no final. Cada mês que você espera tem um custo real.' },
  { icon:'🛡️', cat:'Proteção', text:'Mantenha pelo menos 20-30% em renda fixa independente do seu perfil. É o "colchão" que te permite aproveitar quedas do mercado sem precisar vender na baixa.' },
  { icon:'₿', cat:'Cripto', text:'Bitcoin e criptomoedas têm altíssima volatilidade. Se for investir, limite a no máximo 5-10% da carteira e use apenas o que pode perder totalmente sem impacto no seu padrão de vida.' },
  { icon:'🎯', cat:'Metas', text:'Defina metas específicas: "aposentadoria em 20 anos", "imóvel em 5 anos", "renda passiva de R$5.000/mês". Metas claras determinam o prazo, o perfil e o aporte necessário.' },
  { icon:'📉', cat:'IR', text:'Em ações, vendas abaixo de R$20.000/mês são isentas de IR. Planeje suas vendas para ficar dentro desse limite e economizar imposto legalmente.' },
  { icon:'⚖️', cat:'Rebalanceamento', text:'Rebalanceie sua carteira semestralmente. Se ações subiram muito e agora representam 60% quando deveria ser 40%, venda parte e compre o que está abaixo do alvo. Isso força você a "comprar na baixa e vender na alta".' },
];

// ===================== INIT =====================

document.addEventListener('DOMContentLoaded', async () => {
  setupPWA();
  setupNavScroll();
  setupFAB();
  setupAlertaManualToggle();
  renderCarteira('conservador');
  renderTools('corretoras');
  renderDica();
  loadGeminiState();
  loadAlertasUI();
  requestNotifPermission();

  // Carregar mercado
  await fetchMercado();
  STATE.marketTimer = setInterval(fetchMercado, CFG.UPDATE_INTERVAL);
  STATE.alertTimer  = setInterval(verificarAlertas, CFG.ALERT_CHECK);

  // Gráfico hero demo
  drawHeroChart();

  // Verificar se deve mostrar prompt de instalação PWA
  checkInstallPrompt();
});

// ===================== PWA =====================

function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

let deferredInstall = null;
function checkInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    document.getElementById('btn-install-pwa').style.display = 'flex';
  });
}
function installPWA() {
  if (deferredInstall) {
    deferredInstall.prompt();
    deferredInstall.userChoice.then(() => {
      deferredInstall = null;
      document.getElementById('btn-install-pwa').style.display = 'none';
    });
  } else {
    showToast('📲 Para instalar: clique nos 3 pontos do navegador → "Adicionar à tela inicial"', 'info');
  }
}

// ===================== MERCADO AO VIVO =====================

const FALLBACK_DATA = [
  { nome:'Ibovespa',   val:'134.820', var:'+1,2%', pos:true,  mono:'IBOV' },
  { nome:'Dólar',      val:'5,08',    var:'-0,3%', pos:false, mono:'USD' },
  { nome:'Euro',       val:'5,52',    var:'+0,1%', pos:true,  mono:'EUR' },
  { nome:'CDI',        val:'12,65%',  var:'a.a.',  pos:null,  mono:'CDI' },
  { nome:'Selic',      val:'13,75%',  var:'a.a.',  pos:true,  mono:'SELIC' },
  { nome:'IPCA',       val:'4,83%',   var:'12m',   pos:null,  mono:'IPCA' },
  { nome:'Bitcoin',    val:'R$327K',  var:'+2,1%', pos:true,  mono:'BTC' },
  { nome:'S&P 500',    val:'5.211',   var:'+0,5%', pos:true,  mono:'SPX' },
];

async function fetchMercado() {
  try {
    // Buscar câmbio + cripto (Awesome API - sem auth)
    const [cambioRes, selicRes] = await Promise.allSettled([
      fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL', { signal: AbortSignal.timeout(8000) }),
      fetch('https://brasilapi.com.br/api/taxas/v1', { signal: AbortSignal.timeout(8000) }),
    ]);

    let data = [...FALLBACK_DATA];

    if (cambioRes.status === 'fulfilled' && cambioRes.value.ok) {
      const c = await cambioRes.value.json();
      data = data.map(d => {
        if (d.mono === 'USD' && c.USDBRL) {
          const bid = parseFloat(c.USDBRL.bid).toFixed(2).replace('.',',');
          const pct = parseFloat(c.USDBRL.pctChange);
          return { ...d, val: `R$ ${bid}`, var: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, pos: pct >= 0 };
        }
        if (d.mono === 'EUR' && c.EURBRL) {
          const bid = parseFloat(c.EURBRL.bid).toFixed(2).replace('.',',');
          const pct = parseFloat(c.EURBRL.pctChange);
          return { ...d, val: `R$ ${bid}`, var: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, pos: pct >= 0 };
        }
        if (d.mono === 'BTC' && c.BTCBRL) {
          const val = parseInt(c.BTCBRL.bid);
          const pct = parseFloat(c.BTCBRL.pctChange);
          return { ...d, val: `R$ ${(val/1000).toFixed(0)}K`, var: `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`, pos: pct >= 0 };
        }
        return d;
      });

      // Atualizar hero KPIs com câmbio
      const usd = parseFloat(c.USDBRL?.bid || '5.08').toFixed(2);
      const kpiUsd = document.getElementById('kpi-usd');
      if (kpiUsd) kpiUsd.textContent = `R$${usd}`;
    }

    if (selicRes.status === 'fulfilled' && selicRes.value.ok) {
      const taxas = await selicRes.value.json();
      const selic = taxas.find(t => t.nome === 'Selic');
      const cdi   = taxas.find(t => t.nome === 'CDI');
      const ipca  = taxas.find(t => t.nome === 'IPCA');
      if (selic) {
        data = data.map(d => d.mono === 'SELIC' ? { ...d, val: `${selic.valor.toFixed(2)}%` } : d);
        const kpi = document.getElementById('kpi-selic');
        if (kpi) kpi.textContent = `${selic.valor.toFixed(2)}%`;
      }
      if (cdi) {
        data = data.map(d => d.mono === 'CDI' ? { ...d, val: `${cdi.valor.toFixed(2)}%` } : d);
        const kpi = document.getElementById('kpi-cdi');
        if (kpi) kpi.textContent = `${cdi.valor.toFixed(2)}%`;
      }
      if (ipca) {
        data = data.map(d => d.mono === 'IPCA' ? { ...d, val: `${ipca.valor.toFixed(2)}%` } : d);
        const kpi = document.getElementById('kpi-ipca');
        if (kpi) kpi.textContent = `${ipca.valor.toFixed(2)}%`;
      }
    }

    STATE.mercadoData = data;
    renderMercado(data);
    renderTicker(data);
    setMarketStatus(true);
    document.getElementById('last-update').textContent =
      'Atualizado às ' + new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' });

  } catch {
    STATE.mercadoData = FALLBACK_DATA;
    renderMercado(FALLBACK_DATA);
    renderTicker(FALLBACK_DATA);
    setMarketStatus(false);
  }
}

function setMarketStatus(live) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-txt');
  if (!dot || !txt) return;
  if (live) {
    dot.className = 'status-dot live';
    txt.textContent = 'Ao vivo';
  } else {
    dot.className = 'status-dot';
    txt.textContent = 'Offline';
  }
}

function renderMercado(data) {
  const grid = document.getElementById('mercado-grid');
  if (!grid) return;
  grid.innerHTML = data.map(m => `
    <div class="mercado-card">
      <div class="mercado-nome">${m.nome}</div>
      <div class="mercado-val">${m.val}</div>
      <div class="mercado-var ${m.pos === true ? 'var-pos' : m.pos === false ? 'var-neg' : 'var-neu'}">${m.var}</div>
    </div>
  `).join('');
}

function renderTicker(data) {
  const track = document.getElementById('ticker-track');
  if (!track) return;
  const items = data.map(d => `
    <span class="ticker-item">
      <span class="t-name">${d.mono}</span>
      <span class="t-val">${d.val}</span>
      <span class="${d.pos === true ? 't-up' : d.pos === false ? 't-down' : ''}">${d.var}</span>
    </span>
    <span class="ticker-item"><span class="t-sep">|</span></span>
  `).join('');
  track.innerHTML = items + items; // Duplicar para loop contínuo
}

// ===================== HERO CHART =====================

function drawHeroChart() {
  const canvas = document.getElementById('hero-mini-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const vals   = [100,104,102,108,112,110,119,124,121,129,134,142];
  STATE.chartHero = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        data: vals,
        borderColor: '#00D09C',
        borderWidth: 2,
        fill: true,
        backgroundColor: (ctx2) => {
          const g = ctx2.chart.ctx.createLinearGradient(0,0,0,120);
          g.addColorStop(0,'rgba(0,208,156,0.25)');
          g.addColorStop(1,'rgba(0,208,156,0)');
          return g;
        },
        tension: 0.4,
        pointRadius: 0,
      }]
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1500 },
    }
  });
}

// ===================== NAVEGAÇÃO =====================

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function setupNavScroll() {
  const sections = ['inicio','mercado','simulador','carteira','ferramentas','automacao','alertas'];

  window.addEventListener('scroll', () => {
    let current = 'inicio';
    sections.forEach(s => {
      const el = document.getElementById(s);
      if (el && window.scrollY >= el.offsetTop - 120) current = s;
    });
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const link = document.getElementById('nav-' + current);
    if (link) link.classList.add('active');
  }, { passive: true });
}

function setupFAB() {
  const fab = document.getElementById('fab-scroll');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) fab?.classList.add('visible');
    else fab?.classList.remove('visible');
  }, { passive: true });
}

function toggleMobileMenu() {
  document.getElementById('mobile-nav').classList.toggle('open');
}
function closeMobileMenu() {
  document.getElementById('mobile-nav').classList.remove('open');
}

// ===================== SIMULADOR =====================

function updatePrazoLabel(val) {
  const lbl = document.getElementById('prazo-label');
  if (lbl) lbl.textContent = val + ' ano' + (parseInt(val) > 1 ? 's' : '');
}

function setTaxa(val, btnId) {
  const input = document.getElementById('sim-taxa');
  if (input) input.value = val;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active-preset'));
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active-preset');
}

function calcSim() {
  const inicial  = parseFloat(document.getElementById('sim-inicial')?.value) || 0;
  const mensal   = parseFloat(document.getElementById('sim-mensal')?.value)  || 0;
  const taxaA    = parseFloat(document.getElementById('sim-taxa')?.value)    || 0;
  const anos     = parseInt(document.getElementById('sim-prazo')?.value)      || 10;
  const useIR    = document.getElementById('toggle-ir')?.checked;
  const useInfla = document.getElementById('toggle-inflation')?.checked;
  const meses    = anos * 12;
  const taxaM    = Math.pow(1 + taxaA / 100, 1 / 12) - 1;
  const inflaM   = Math.pow(1.045, 1/12) - 1;

  // Cenários
  const cenarios = [
    { label:'Pessimista', taxa: taxaA * 0.6, cor: '#FF4757', cls:'pess' },
    { label:'Realista',   taxa: taxaA,       cor: '#00D09C', cls:'real' },
    { label:'Otimista',   taxa: taxaA * 1.4, cor: '#F0A500', cls:'otim' },
  ];

  // Projeção principal
  const labels   = [];
  const seriePatr= [];
  const serieApt = [];
  let patrimonio  = inicial;
  let totalAport  = inicial;

  for (let m = 0; m <= meses; m++) {
    if (m > 0) { patrimonio = patrimonio * (1 + taxaM) + mensal; totalAport += mensal; }
    if (m % 12 === 0) {
      labels.push(m/12 + 'a');
      seriePatr.push(parseFloat(patrimonio.toFixed(2)));
      serieApt.push(parseFloat(totalAport.toFixed(2)));
    }
  }

  // IR (tabela regressiva — simplificada para renda fixa)
  let patrimonioFinal = patrimonio;
  if (useIR) {
    const rendimento = patrimonio - totalAport;
    const aliq = anos >= 4 ? 0.15 : anos >= 2 ? 0.17 : anos >= 1 ? 0.20 : 0.225;
    patrimonioFinal = totalAport + rendimento * (1 - aliq);
  }

  // Valor real descontando inflação
  let patrimonioReal = patrimonioFinal;
  if (useInfla) {
    patrimonioReal = patrimonioFinal / Math.pow(1.045, anos);
  }

  // Exibir resultado
  const resultEl = document.getElementById('sim-result');
  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Badges
  const fator = (patrimonioFinal / (inicial || 1)).toFixed(1);
  const rendFinal = patrimonioFinal - totalAport;
  const el = document.getElementById('result-badges');
  if (el) el.innerHTML = `
    <span class="result-badge badge-gold">💰 ${fator}x</span>
    <span class="result-badge badge-green">📈 ${taxaA}% a.a.</span>
    ${useIR ? `<span class="result-badge badge-gold">🧾 IR incluído</span>` : ''}
  `;

  // Chart.js
  renderSimChart(labels, seriePatr, serieApt);

  // Números
  const numsEl = document.getElementById('result-nums');
  if (numsEl) numsEl.innerHTML = `
    <div class="result-num-item">
      <div class="result-num-val">${fmt(patrimonioFinal)}</div>
      <div class="result-num-lbl">Patrimônio Final${useIR ? ' (líq. IR)':''}</div>
    </div>
    <div class="result-num-item">
      <div class="result-num-val">${fmt(totalAport)}</div>
      <div class="result-num-lbl">Total Investido</div>
    </div>
    <div class="result-num-item">
      <div class="result-num-val text-green">${fmt(rendFinal)}</div>
      <div class="result-num-lbl">Rendimentos 🎉</div>
    </div>
    ${useInfla ? `
    <div class="result-num-item" style="grid-column:span 3">
      <div class="result-num-val" style="font-size:16px;color:var(--text-2)">${fmt(patrimonioReal)} em poder de compra atual (descontada inflação)</div>
    </div>` : ''}
  `;

  // Cenários
  const scenRow = document.getElementById('scenarios-row');
  if (scenRow) {
    scenRow.innerHTML = cenarios.map(sc => {
      let p = inicial, ta = inicial;
      const tm = Math.pow(1 + sc.taxa/100, 1/12) - 1;
      for (let m = 1; m <= meses; m++) { p = p*(1+tm)+mensal; ta+=mensal; }
      return `<div class="scenario-card ${sc.cls}">
        <div class="sc-label" style="color:${sc.cor}">${sc.label}</div>
        <div class="sc-val" style="color:${sc.cor}">${fmt(p)}</div>
        <div class="sc-taxa">${sc.taxa.toFixed(1)}% a.a.</div>
      </div>`;
    }).join('');
  }

  renderAutomacao(taxaA);
}

function renderSimChart(labels, seriePatr, serieApt) {
  const canvas = document.getElementById('sim-chart');
  if (!canvas) return;
  if (STATE.chartSim) { STATE.chartSim.destroy(); STATE.chartSim = null; }
  const ctx = canvas.getContext('2d');

  const gradPatr = ctx.createLinearGradient(0,0,0,240);
  gradPatr.addColorStop(0,'rgba(0,208,156,0.4)');
  gradPatr.addColorStop(1,'rgba(0,208,156,0.02)');

  STATE.chartSim = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Patrimônio',
          data: seriePatr,
          borderColor: '#00D09C',
          borderWidth: 3,
          backgroundColor: gradPatr,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00D09C',
        },
        {
          label: 'Total Investido',
          data: serieApt,
          borderColor: '#3b82f6',
          borderWidth: 2,
          backgroundColor: 'rgba(59,130,246,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderDash: [6,4],
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: {
          labels: { color:'#8CA0B3', font: { family:'Inter', size:12 }, boxWidth:14, padding:20 }
        },
        tooltip: {
          backgroundColor:'rgba(13,20,33,0.95)',
          borderColor:'rgba(255,255,255,0.1)',
          borderWidth:1,
          titleColor:'#E8EDF5',
          bodyColor:'#8CA0B3',
          padding:12,
          callbacks: {
            label(ctx2) { return ` ${ctx2.dataset.label}: ${fmt(ctx2.parsed.y)}`; }
          }
        }
      },
      scales: {
        x: {
          ticks: { color:'#4A5E6F', font:{family:'JetBrains Mono',size:11} },
          grid:  { color:'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color:'#4A5E6F', font:{family:'JetBrains Mono',size:11}, callback: v => fmtShort(v) },
          grid:  { color:'rgba(255,255,255,0.04)' },
        }
      }
    }
  });
}

function renderAutomacao(taxa) {
  const box = document.getElementById('automacao-recomendacao');
  if (!box) return;
  if (taxa <= 16) {
    box.innerHTML = `
      <div class="auto-box auto-box-robo">
        <div class="auto-box-title">🤖 Estratégia combina com automação passiva</div>
        <div class="auto-box-desc">Com rentabilidade de <strong>${taxa}% a.a.</strong>, um <strong>robô consultor</strong> é a melhor opção — monta e rebalanceia automaticamente sem você precisar acompanhar diariamente.</div>
        <a class="auto-box-btn" href="https://oiwarren.com" target="_blank">🤖 Warren →</a>
        <a class="auto-box-btn" href="https://magnetis.com.br" target="_blank" style="background:var(--gold-grad)">🧲 Magnetis →</a>
      </div>`;
  } else {
    box.innerHTML = `
      <div class="auto-box auto-box-trade">
        <div class="auto-box-title">⚡ Estratégia arrojada — Robô Trader recomendado</div>
        <div class="auto-box-desc">Para buscar <strong>${taxa}% a.a. ou mais</strong>, você precisa de operações ativas na B3. Um <strong>robô trader</strong> opera mini-contratos 24h sem você ficar na frente do computador.</div>
        <a class="auto-box-btn" href="https://smarttbot.com" target="_blank">⚡ SmarttBot →</a>
        <a class="auto-box-btn" href="https://clear.com.br" target="_blank" style="background:#7c3aed">📈 Clear →</a>
      </div>`;
  }
}

// ===================== CALCULADORAS =====================

function calcFII() {
  const preco = parseFloat(document.getElementById('fii-preco')?.value) || 0;
  const dy    = parseFloat(document.getElementById('fii-dy')?.value) || 0;
  const cotas = parseFloat(document.getElementById('fii-cotas')?.value) || 0;
  if (!preco || !dy || !cotas) return showToast('Preencha todos os campos', 'error');
  const rendMensal = (preco * (dy/100) / 12) * cotas;
  const totalInvest = preco * cotas;
  const el = document.getElementById('fii-result');
  el.innerHTML = `💰 Renda mensal: <strong>${fmt(rendMensal)}</strong>\n📊 DY mensal: <strong>${(dy/12).toFixed(2)}%</strong>\n💼 Total investido: <strong>${fmt(totalInvest)}</strong>`;
  el.classList.add('visible');
}

function calcDY() {
  const div   = parseFloat(document.getElementById('dy-div')?.value) || 0;
  const preco = parseFloat(document.getElementById('dy-preco')?.value) || 0;
  if (!div || !preco) return showToast('Preencha todos os campos', 'error');
  const dy = ((div / preco) * 100).toFixed(2);
  const el = document.getElementById('dy-result');
  el.innerHTML = `📈 Dividend Yield: <strong>${dy}%</strong> a.a.\n📅 DY mensal: <strong>${(dy/12).toFixed(3)}%</strong>\n⭐ ${parseFloat(dy) >= 8 ? 'Ótimo rendimento!' : parseFloat(dy) >= 5 ? 'Rendimento razoável' : 'Abaixo da média de FIIs'}`;
  el.classList.add('visible');
}

function calcIR() {
  const compra = parseFloat(document.getElementById('ir-compra')?.value) || 0;
  const venda  = parseFloat(document.getElementById('ir-venda')?.value) || 0;
  const tipo   = document.getElementById('ir-tipo')?.value;
  if (!compra || !venda) return showToast('Preencha os valores', 'error');
  const ganho  = venda - compra;
  if (ganho <= 0) {
    const el = document.getElementById('ir-result');
    el.innerHTML = `✅ Sem IR — operação com prejuízo de ${fmt(Math.abs(ganho))}\n💡 Prejudízo pode ser abatido em ganhos futuros do mesmo mês.`;
    el.classList.add('visible');
    return;
  }
  let aliq = 0.15;
  let obs  = '';
  if (tipo === 'acoes') {
    aliq = venda > 20000 ? 0.20 : 0.15;
    obs  = venda <= 20000 ? '⭐ Venda abaixo de R$20K — pode ser isenta! Verifique com seu contador.' : '⚠️ Venda acima de R$20K — alíquota de 20%';
  } else if (tipo === 'fii') {
    aliq = 0.20;
    obs  = 'FIIs: alíquota fixa de 20% sobre o ganho de capital';
  } else {
    aliq = 0.15;
    obs  = 'RF com prazo longo (>2 anos) — alíquota de 15%';
  }
  const ir = ganho * aliq;
  const el = document.getElementById('ir-result');
  el.innerHTML = `📊 Ganho bruto: <strong>${fmt(ganho)}</strong>\n🧾 IR (${(aliq*100).toFixed(0)}%): <strong style="color:#FF4757">${fmt(ir)}</strong>\n💰 Ganho líquido: <strong style="color:#00D09C">${fmt(ganho - ir)}</strong>\n${obs}`;
  el.classList.add('visible');
}

// ===================== CARTEIRA =====================

function selectPerfil(perfil) {
  STATE.perfilAtual = perfil;
  document.querySelectorAll('.perfil-card').forEach(c => c.classList.remove('active'));
  const el = document.getElementById('perfil-' + perfil);
  if (el) el.classList.add('active');
  renderCarteira(perfil);
}

function renderCarteira(perfil) {
  const dados  = PERFIS[perfil];
  const canvas = document.getElementById('carteira-chart');
  if (!canvas) return;

  if (STATE.chartCart) { STATE.chartCart.destroy(); STATE.chartCart = null; }
  const ctx = canvas.getContext('2d');

  STATE.chartCart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: dados.ativos.map(a => a.nome),
      datasets: [{
        data: dados.ativos.map(a => a.pct),
        backgroundColor: dados.cores,
        borderColor: '#060B14',
        borderWidth: 3,
        hoverBorderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor:'rgba(13,20,33,0.95)',
          borderColor:'rgba(255,255,255,0.1)',
          borderWidth:1,
          titleColor:'#E8EDF5',
          bodyColor:'#8CA0B3',
          callbacks: { label: ctx2 => ` ${ctx2.label}: ${ctx2.parsed}%` }
        }
      },
      animation: { animateRotate: true, duration: 800 },
    }
  });

  // Legenda
  const legend = document.getElementById('carteira-legend');
  if (legend) {
    legend.innerHTML = dados.ativos.map((a,i) => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${dados.cores[i]}"></div>
        <span style="font-weight:600;color:${dados.cores[i]}">${a.pct}%</span>
        <span>${a.nome}</span>
      </div>`).join('');
  }

  // Lista ativos
  const ativosEl = document.getElementById('carteira-ativos');
  if (ativosEl) {
    ativosEl.innerHTML = dados.ativos.map((a,i) => `
      <div class="ativo-row">
        <div class="ativo-icon">${a.icon}</div>
        <div class="ativo-info">
          <div class="ativo-nome">${a.nome}</div>
          <div class="ativo-tipo">${a.tipo}</div>
          <div class="ativo-bar">
            <div class="ativo-bar-fill" style="width:${a.pct}%;background:${dados.cores[i]}"></div>
          </div>
        </div>
        <div class="ativo-pct" style="color:${dados.cores[i]}">${a.pct}%</div>
      </div>`).join('');
  }
}

// ===================== FERRAMENTAS =====================

function showToolTab(cat) {
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + cat);
  if (tab) tab.classList.add('active');
  renderTools(cat);
}

function renderTools(cat) {
  const list = FERRAMENTAS[cat] || [];
  const grid = document.getElementById('tools-content');
  if (!grid) return;
  grid.innerHTML = list.map(t => `
    <div class="tool-card" onclick="openModal('${cat}','${t.nome.replace(/'/g,"\\'")}')">
      <div class="tool-card-header">
        <div class="tool-card-icon">${t.icon}</div>
        <div>
          <div class="tool-card-name">${t.nome}</div>
          <div class="tool-card-cat">${t.cat}</div>
        </div>
      </div>
      <div class="tool-card-desc">${t.desc}</div>
      <div class="tool-card-tags">${t.tags.map(g => `<span class="tool-tag">${g}</span>`).join('')}</div>
      <div class="tool-card-btn">Ver detalhes →</div>
    </div>
  `).join('');
}

// ===================== DICAS IA =====================

function renderDica() {
  const dica = DICAS[STATE.dicaIndex % DICAS.length];
  const icon = document.getElementById('dica-icon');
  const text = document.getElementById('dica-text');
  const cat  = document.getElementById('dica-cat');
  const card = document.getElementById('dica-card');
  if (!icon || !text || !cat) return;
  if (card) { card.style.opacity = '0'; card.style.transform = 'translateY(10px)'; }
  setTimeout(() => {
    icon.textContent = dica.icon;
    text.textContent = dica.text;
    cat.textContent  = dica.cat;
    if (card) { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; card.style.transition = 'all 0.4s ease'; }
  }, 200);
}

function nextDica() {
  STATE.dicaIndex++;
  renderDica();
}

// Auto-rodar dicas
setInterval(() => { STATE.dicaIndex++; renderDica(); }, 12000);

// ===================== GEMINI IA =====================

function loadGeminiState() {
  if (STATE.geminiKey) {
    const inp = document.getElementById('gemini-key');
    if (inp) inp.value = STATE.geminiKey;
    setGeminiStatus(true);
  }
}

function toggleKeyVisibility() {
  const inp = document.getElementById('gemini-key');
  const btn = document.getElementById('btn-eye');
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; if (btn) btn.textContent = '🙈'; }
  else { inp.type = 'password'; if (btn) btn.textContent = '👁️'; }
}

function connectGemini() {
  const key = document.getElementById('gemini-key')?.value.trim();
  if (!key || !key.startsWith('AI')) {
    showToast('⚠️ Insira uma chave Gemini válida (começa com "AI")', 'error');
    return;
  }
  STATE.geminiKey = key;
  localStorage.setItem('ibr_gemini_key', key);
  setGeminiStatus(true);
  showToast('🤖 Gemini conectado com sucesso!', 'success');
}

function clearGeminiKey() {
  STATE.geminiKey = '';
  localStorage.removeItem('ibr_gemini_key');
  const inp = document.getElementById('gemini-key');
  if (inp) inp.value = '';
  setGeminiStatus(false);
  showToast('🔑 Chave removida', 'info');
}

function setGeminiStatus(connected) {
  const ind = document.getElementById('api-indicator');
  const txt = document.getElementById('api-status-txt');
  if (!ind || !txt) return;
  ind.className = 'status-indicator ' + (connected ? 'connected' : 'disconnected');
  txt.textContent = connected ? '✅ Conectado' : 'Não conectado';
}

async function callGemini(prompt) {
  if (!STATE.geminiKey) {
    return 'Para usar análises por IA, conecte sua chave Gemini gratuita no painel de Automação acima. Acesse: https://aistudio.google.com/app/apikey';
  }
  const url = `${CFG.GEMINI_URL}${CFG.GEMINI_MODEL}:generateContent?key=${STATE.geminiKey}`;
  const body = { contents:[{ parts:[{ text: prompt }] }] };
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Erro na API Gemini');
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta da IA.';
}

async function analisarCarteiraIA() {
  const el = document.getElementById('analise-result');
  if (!el) return;
  el.className = 'ia-result loading';
  el.innerHTML = '🤖 Analisando sua carteira...';
  el.style.display = 'block';

  const perfil = PERFIS[STATE.perfilAtual];
  const prompt = `Você é um assessor de investimentos brasileiro especialista. Analise esta carteira de investimentos:

Perfil: ${perfil.label} ${perfil.emoji}
Composição:
${perfil.ativos.map(a => `- ${a.nome} (${a.tipo}): ${a.pct}%`).join('\n')}

Contexto de mercado atual (referência):
- Selic: ~13,75% a.a.
- IPCA: ~4,83%
- Ibovespa: ~134.000 pontos

Por favor:
1. Avalie os pontos fortes desta carteira
2. Identifique riscos e oportunidades
3. Dê 3 recomendações práticas específicas
4. Sugira ajustes se necessário

Seja direto e prático. Máximo 250 palavras.`;

  try {
    const resp = await callGemini(prompt);
    el.className = 'ia-result visible';
    el.innerHTML = resp.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  } catch(e) {
    el.className = 'ia-result visible';
    el.innerHTML = '❌ Erro: ' + e.message;
  }
}

async function sendChat() {
  const inp = document.getElementById('chat-input');
  const box = document.getElementById('chat-box');
  if (!inp || !box) return;
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  // Adicionar mensagem do usuário
  box.innerHTML += `<div class="chat-msg user"><span>${msg}</span></div>`;
  box.innerHTML += `<div class="chat-msg bot chat-typing"><span>🤖</span><span>Pensando...</span></div>`;
  box.scrollTop = box.scrollHeight;

  const prompt = `Você é um assessor financeiro brasileiro especialista em investimentos. Responda de forma direta, clara e prática em português, máximo 150 palavras. Pergunta: ${msg}`;

  try {
    const resp = await callGemini(prompt);
    const typing = box.querySelector('.chat-typing');
    if (typing) typing.remove();
    box.innerHTML += `<div class="chat-msg bot"><span>🤖</span><span>${resp.replace(/\n/g,'<br>')}</span></div>`;
  } catch(e) {
    const typing = box.querySelector('.chat-typing');
    if (typing) typing.outerHTML = `<div class="chat-msg bot"><span>🤖</span><span>❌ ${e.message}</span></div>`;
  }
  box.scrollTop = box.scrollHeight;
}

async function gerarRelatorio() {
  const el = document.getElementById('relatorio-result');
  if (!el) return;
  const inclMacro = document.getElementById('rel-macro')?.checked;
  const inclDicas  = document.getElementById('rel-dicas')?.checked;

  el.className = 'ia-result loading';
  el.innerHTML = '📄 Gerando relatório...';
  el.style.display = 'block';

  const perfil = PERFIS[STATE.perfilAtual];
  const prompt = `Gere um relatório mensal de investimentos em português para um investidor com perfil ${perfil.label}.

Carteira atual:
${perfil.ativos.map(a => `- ${a.nome}: ${a.pct}%`).join('\n')}

${inclMacro ? 'Inclua análise macro do mercado brasileiro atual (Selic, inflação, B3).' : ''}
${inclDicas ? 'Inclua 3 dicas personalizadas para o perfil.' : ''}

Formato: Relatório com seções claras. Máximo 300 palavras. Use emojis para tornar mais visual.`;

  try {
    const resp = await callGemini(prompt);
    el.className = 'ia-result visible';
    el.innerHTML = resp.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  } catch(e) {
    el.className = 'ia-result visible';
    el.innerHTML = '❌ Erro: ' + e.message;
  }
}

async function calcRebalanceamento() {
  const patrimonio = parseFloat(document.getElementById('rb-patrimonio')?.value) || 0;
  const el = document.getElementById('rebalance-result');
  if (!el || !patrimonio) return showToast('Informe o patrimônio total', 'error');

  const perfil = PERFIS[STATE.perfilAtual];
  const linhas = perfil.ativos.map(a => `${a.nome}: ideal=${a.pct}%, valor ideal=R$${((a.pct/100)*patrimonio).toLocaleString('pt-BR',{maximumFractionDigits:0})}`);

  el.className = 'ia-result visible';
  el.innerHTML = `<strong>📊 Rebalanceamento para ${fmt(patrimonio)} — Perfil ${perfil.label}</strong>\n\n` +
    linhas.join('\n') +
    `\n\n💡 Compre os ativos que estão abaixo do percentual ideal e venda os que estão acima. Rebalanceie semestralmente.`;
}

// ===================== ALERTAS =====================

function setupAlertaManualToggle() {
  const sel = document.getElementById('alerta-ativo');
  if (!sel) return;
  sel.addEventListener('change', () => {
    const grp = document.getElementById('alerta-manual-grp');
    if (grp) grp.style.display = sel.value === 'OUTRO' ? 'block' : 'none';
  });
}

async function requestNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    document.getElementById('notif-box') && (document.getElementById('notif-box').style.display = 'block');
  }
}

async function requestNotifPermissionBtn() {
  if (!('Notification' in window)) { showToast('Notificações não suportadas', 'error'); return; }
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    showToast('🔔 Notificações ativadas!', 'success');
    const nb = document.getElementById('notif-box');
    if (nb) nb.style.display = 'none';
  } else {
    showToast('⚠️ Notificações bloqueadas. Habilite nas configurações do browser.', 'error');
  }
}

function criarAlerta() {
  const ativo = document.getElementById('alerta-ativo')?.value;
  const cond  = document.getElementById('alerta-cond')?.value;
  const valor = parseFloat(document.getElementById('alerta-valor')?.value);
  const msg   = document.getElementById('alerta-msg')?.value.trim();
  const manual = document.getElementById('alerta-manual')?.value.trim();

  if (!valor) { showToast('Informe o valor do alerta', 'error'); return; }
  const nomeAtivo = ativo === 'OUTRO' ? (manual || 'Personalizado') : ativo;

  const alerta = {
    id: Date.now(),
    ativo: nomeAtivo,
    cond,
    valor,
    msg: msg || `${nomeAtivo} ${cond === 'acima' ? 'subiu acima' : 'caiu abaixo'} de ${valor}`,
    ativo_key: ativo,
    criadoEm: new Date().toLocaleString('pt-BR'),
    disparado: false,
  };

  STATE.alertas.push(alerta);
  localStorage.setItem('ibr_alertas', JSON.stringify(STATE.alertas));
  loadAlertasUI();
  showToast(`🔔 Alerta criado: ${alerta.msg}`, 'success');

  // Limpar form
  const vEl = document.getElementById('alerta-valor');
  const mEl = document.getElementById('alerta-msg');
  if (vEl) vEl.value = '';
  if (mEl) mEl.value = '';
}

function loadAlertasUI() {
  const list = document.getElementById('alertas-list');
  if (!list) return;
  if (STATE.alertas.length === 0) {
    list.innerHTML = `<div class="alertas-empty"><div style="font-size:48px">🔕</div><p>Nenhum alerta criado ainda.</p></div>`;
    return;
  }
  list.innerHTML = STATE.alertas.map(a => `
    <div class="alerta-item ${a.disparado ? 'triggered':''}" id="alerta-${a.id}">
      <div class="alerta-icon">${a.disparado ? '✅' : '🔔'}</div>
      <div class="alerta-info">
        <div class="alerta-desc">${a.msg}</div>
        <div class="alerta-status">${a.ativo} ${a.cond === 'acima' ? '↑' : '↓'} ${a.valor} · ${a.criadoEm}</div>
      </div>
      <button class="alerta-delete" onclick="excluirAlerta(${a.id})" title="Excluir">🗑️</button>
    </div>`).join('');
}

function excluirAlerta(id) {
  STATE.alertas = STATE.alertas.filter(a => a.id !== id);
  localStorage.setItem('ibr_alertas', JSON.stringify(STATE.alertas));
  loadAlertasUI();
}

function limparAlertas() {
  STATE.alertas = [];
  localStorage.setItem('ibr_alertas', JSON.stringify([]));
  loadAlertasUI();
  showToast('🗑️ Alertas removidos', 'info');
}

async function verificarAlertas() {
  if (STATE.alertas.length === 0 || STATE.mercadoData.length === 0) return;

  const valores = {};
  STATE.mercadoData.forEach(d => {
    const numStr = d.val.replace(/[^0-9,.]/g,'').replace(',','.');
    const num = parseFloat(numStr);
    if (!isNaN(num)) valores[d.mono] = num;
  });

  STATE.alertas.forEach(a => {
    if (a.disparado) return;
    const atual = valores[a.ativo_key];
    if (!atual) return;
    const disparo = (a.cond === 'acima' && atual > a.valor) || (a.cond === 'abaixo' && atual < a.valor);
    if (disparo) {
      a.disparado = true;
      dispararAlerta(a, atual);
    }
  });

  localStorage.setItem('ibr_alertas', JSON.stringify(STATE.alertas));
  loadAlertasUI();
}

function dispararAlerta(alerta, valorAtual) {
  showToast(`🔔 ALERTA: ${alerta.msg} (atual: ${valorAtual})`, 'success');
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('InvestidorBR — Alerta de Preço 🔔', {
      body: `${alerta.msg}\nValor atual: ${valorAtual}`,
      icon: 'icons/icon-192.png',
    });
  }
}

// ===================== MODAL =====================

function openModal(cat, nome) {
  const list = FERRAMENTAS[cat] || [];
  const tool = list.find(t => t.nome === nome);
  if (!tool) return;
  const m = tool.modal;
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <div class="modal-icon">${tool.icon}</div>
      <div class="modal-title">${tool.nome}</div>
      <div class="modal-cat">${tool.cat}</div>
    </div>
    <div class="modal-body">
      <p>${tool.desc}</p><br>
      <strong>✅ Pontos positivos</strong>
      <ul>${m.pros.map(p => `<li>${p}</li>`).join('')}</ul>
      <strong>⚠️ Pontos de atenção</strong>
      <ul>${m.contras.map(c => `<li>${c}</li>`).join('')}</ul><br>
      <p><strong>👤 Ideal para:</strong> ${m.ideal}</p>
      <p><strong>💵 Mínimo:</strong> ${m.minimo}</p>
    </div>
    <div class="modal-footer">
      <a class="btn-primary" href="${tool.url}" target="_blank" style="text-decoration:none">Acessar ${tool.nome} 🚀</a>
      <button class="btn-ghost" onclick="closeModal()">Fechar</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ===================== TOAST =====================

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { success:'✅', error:'❌', info:'💡' };
  const div = document.createElement('div');
  div.className = `toast ${type}`;
  div.innerHTML = `<span>${icons[type]||'💡'}</span><span>${msg}</span>`;
  container.appendChild(div);
  setTimeout(() => {
    div.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => div.remove(), 300);
  }, 4000);
}

// ===================== UTILITÁRIOS =====================

function fmt(val) {
  return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtShort(val) {
  if (val >= 1_000_000_000) return 'R$' + (val/1_000_000_000).toFixed(1) + 'B';
  if (val >= 1_000_000)     return 'R$' + (val/1_000_000).toFixed(1) + 'M';
  if (val >= 1_000)         return 'R$' + (val/1_000).toFixed(0) + 'K';
  return 'R$' + val.toFixed(0);
}
