import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const [
      trainingRequests,
      userAuthorizations,
      routingRules,
      satisfactionSurveys,
      trainingEvaluations,
      emailTemplates,
      surveyResponses,
      users,
    ] = await Promise.all([
      base44.asServiceRole.entities.TrainingRequest.list('-created_date', 500),
      base44.asServiceRole.entities.UserAuthorization.list('-created_date', 500),
      base44.asServiceRole.entities.RoutingRule.list('-created_date', 500),
      base44.asServiceRole.entities.SatisfactionSurvey.list('-created_date', 500),
      base44.asServiceRole.entities.TrainingEvaluation.list('-created_date', 500),
      base44.asServiceRole.entities.EmailTemplate.list('-created_date', 500),
      base44.asServiceRole.entities.SurveyResponse.list('-created_date', 500),
      base44.asServiceRole.entities.User.list('-created_date', 500),
    ]);

    const safeUsers = users.map((item) => ({
      id: item.id,
      created_date: item.created_date,
      updated_date: item.updated_date,
      full_name: item.full_name,
      email: item.email,
      role: item.role,
      region: item.region,
      photo_url: item.photo_url,
      receive_access_request_emails: item.receive_access_request_emails,
    }));

    return Response.json({
      exported_at: new Date().toISOString(),
      entities: {
        TrainingRequest: trainingRequests,
        UserAuthorization: userAuthorizations,
        RoutingRule: routingRules,
        SatisfactionSurvey: satisfactionSurveys,
        TrainingEvaluation: trainingEvaluations,
        EmailTemplate: emailTemplates,
        SurveyResponse: surveyResponses,
        User: safeUsers,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}