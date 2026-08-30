import { describe, expect, it } from 'vitest';
import {
  announcerProfilePrompt,
  legacyAnnouncerProfile,
  type AnnouncerEditorialProfile,
} from './profile';

const stationId = '11111111-1111-4111-8111-111111111111';
const voiceId = '22222222-2222-4222-8222-222222222222';

describe('announcer editorial profile', () => {
  it('recovers every field from the previous five-pillar personality', () => {
    const profile = legacyAnnouncerProfile(
      JSON.stringify({
        essencia: 'Confiante e próximo',
        presencaEntrega: 'Ritmo vivo e pausas curtas',
        assinaturasSlogans: 'A melhor na web',
        interessesEditoriais: 'Histórias de bastidores da música',
        oQueEvitar: 'Clichês e fatos não verificados',
      }),
      stationId,
      voiceId,
    );

    expect(profile).toMatchObject({
      personality: 'Confiante e próximo',
      deliveryStyle: 'Ritmo vivo e pausas curtas',
      signatures: 'A melhor na web',
      editorialPreferences: 'Histórias de bastidores da música',
      avoidances: 'Clichês e fatos não verificados',
      humorLevel: 'balanced',
    });
  });

  it('places the full profile and humor policy in the editorial prompt', () => {
    const profile: AnnouncerEditorialProfile = {
      stationId,
      voiceId,
      personality: 'Espontâneo e inteligente',
      deliveryStyle: 'Conversa direta',
      exampleScripts: 'Que bom ter você por aqui.',
      signatures: 'A melhor na web',
      announcerName: 'Rachel Anderson',
      editorialPreferences: 'Curiosidades musicais verificadas',
      avoidances: 'Não repetir aberturas',
      pronunciationGuide: 'Bowie: BOH-ee',
      humorLevel: 'free',
      energyLevel: 'high',
      reactionsEnabled: true,
    };

    const prompt = announcerProfilePrompt(profile);
    expect(prompt).toContain('Espontâneo e inteligente');
    expect(prompt).toContain('Conversa direta');
    expect(prompt).toContain('A melhor na web');
    expect(prompt).toContain('Curiosidades musicais verificadas');
    expect(prompt).toContain('Não repetir aberturas');
    expect(prompt).toContain('Humor is free and spontaneous');
    expect(prompt).toContain('Rachel Anderson');
    expect(prompt).toContain('stable identity anchor');
    expect(prompt).toContain('Energy: high');
    expect(prompt).toContain('Bowie: BOH-ee');
  });
});
