'use client';

import type { RoleSkills } from '@smart-team/shared';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/** Skills per role, keyed like the manifest ("planner", "nextDev.worker"). Loaded once per page. */
export function useSkillRoles() {
  const [roles, setRoles] = useState<Record<string, RoleSkills['skills']>>({});

  useEffect(() => {
    api
      .skillRoles()
      .then((list) => setRoles(Object.fromEntries(list.map((r) => [r.role, r.skills]))))
      .catch(() => {
        // The card then shows no skills; nothing else depends on this.
      });
  }, []);

  return roles;
}
