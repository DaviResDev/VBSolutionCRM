// Script para testar a conexão com o Supabase
// Execute este script no console do navegador na página /inventory

console.log('🧪 Testando conexão com Supabase...');

// Verificar se o Supabase está disponível
if (typeof window !== 'undefined' && window.supabase) {
  console.log('✅ Supabase disponível no window');
} else {
  console.log('❌ Supabase não encontrado no window');
}

// Verificar se o usuário está autenticado
async function testAuth() {
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    if (error) {
      console.error('❌ Erro ao obter usuário:', error);
      return;
    }
    
    if (user) {
      console.log('✅ Usuário autenticado:', user.id, user.email);
      return user;
    } else {
      console.log('❌ Nenhum usuário autenticado');
      return null;
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    return null;
  }
}

// Testar criação de produto
async function testCreateProduct(user) {
  try {
    console.log('🧪 Testando criação de produto...');
    
    const testProduct = {
      owner_id: user.id,
      name: 'Produto Teste',
      sku: `TEST-${Date.now()}`,
      category: 'Teste',
      base_price: 10.00,
      min_stock: 5,
      description: 'Produto de teste',
      type: 'product',
      stock: 10
    };
    
    const { data, error } = await window.supabase
      .from('products')
      .insert([testProduct])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar produto:', error);
      return null;
    }
    
    console.log('✅ Produto criado com sucesso:', data);
    return data;
  } catch (err) {
    console.error('❌ Erro inesperado ao criar produto:', err);
    return null;
  }
}

// Testar criação de item de inventário
async function testCreateInventory(user, product) {
  try {
    console.log('🧪 Testando criação de item de inventário...');
    
    const testInventory = {
      owner_id: user.id,
      product_id: product.id,
      quantity: 10,
      location: 'Estoque Teste'
    };
    
    const { data, error } = await window.supabase
      .from('inventory')
      .insert([testInventory])
      .select(`
        *,
        products (
          id,
          name,
          sku,
          category,
          base_price,
          min_stock,
          image_url,
          description
        )
      `)
      .single();
    
    if (error) {
      console.error('❌ Erro ao criar item de inventário:', error);
      return null;
    }
    
    console.log('✅ Item de inventário criado com sucesso:', data);
    return data;
  } catch (err) {
    console.error('❌ Erro inesperado ao criar item de inventário:', err);
    return null;
  }
}

// Executar todos os testes
async function runTests() {
  console.log('🚀 Iniciando testes...');
  
  const user = await testAuth();
  if (!user) {
    console.log('❌ Testes interrompidos: usuário não autenticado');
    return;
  }
  
  const product = await testCreateProduct(user);
  if (!product) {
    console.log('❌ Testes interrompidos: falha ao criar produto');
    return;
  }
  
  const inventory = await testCreateInventory(user, product);
  if (!inventory) {
    console.log('❌ Testes interrompidos: falha ao criar item de inventário');
    return;
  }
  
  console.log('🎉 Todos os testes passaram!');
  console.log('📊 Dados criados:', { user: user.id, product: product.id, inventory: inventory.id });
}

// Executar testes
runTests();
