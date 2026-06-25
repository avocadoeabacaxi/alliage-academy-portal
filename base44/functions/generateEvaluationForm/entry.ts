import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { trainingRequestId } = await req.json();

    // Fetch training request details
    const request = await base44.entities.TrainingRequest.get(trainingRequestId);
    if (!request) {
      return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });
    }

    // Generate intelligent questions based on training content
    const prompt = `Você é um especialista em criação de formulários de avaliação de treinamento. 
Com base nos seguintes detalhes da solicitação de treinamento, gere um formulário de avaliação inteligente e específico:

Produto: ${request.product_name}
Tipo de Treinamento: ${request.request_type}
Foco do Treinamento: ${request.training_focus?.text || 'Geral'}
Formato: ${request.format}
Educador: ${request.educator_name}
Objetivo: ${request.justification?.text || 'Capacitação'}

Crie um objeto JSON com esta estrutura exata:
{
  "questions": [
    {"id": "q1", "category": "content", "text": "...", "type": "scale", "scale": 5},
    {"id": "q2", "category": "educator", "text": "...", "type": "scale", "scale": 5},
    {"id": "q3", "category": "relevance", "text": "...", "type": "scale", "scale": 5},
    {"id": "nps", "category": "nps", "text": "Em uma escala de 0-10, o quanto você recomendaria este treinamento?", "type": "nps", "scale": 10},
    {"id": "feedback", "category": "general", "text": "Qual foi o seu maior aprendizado neste treinamento?", "type": "text"}
  ]
}

Garanta que as questões sejam específicas ao produto e tipo de treinamento mencionados.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt
    });

    // Generate unique token for public access
    const publicToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Parse LLM response as JSON if it's a string
    let questionsData = [];
    try {
      const parsed = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;
      questionsData = parsed.questions || [];
    } catch (e) {
      console.log('Could not parse LLM response as JSON');
    }

    // Create evaluation record
    const evaluation = await base44.entities.TrainingEvaluation.create({
      training_request_id: trainingRequestId,
      request_id_display: request.request_id,
      educator_name: request.educator_name || 'A Definir',
      educator_id: request.educator_id,
      product_name: request.product_name,
      training_date: request.training_completed_date || request.training_scheduled_date,
      questions: questionsData,
      status: 'pending',
      public_token: publicToken
    });

    return Response.json({
      success: true,
      evaluation_id: evaluation.id,
      public_token: publicToken,
      questions_count: (llmResponse.questions || []).length
    });
  } catch (error) {
    console.error('Erro ao gerar formulário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});