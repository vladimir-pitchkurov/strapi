import { useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import pluginId from '../pluginId';
// TODO: to replace with the import from utils when the index is migrated to TypeScript
import { getTrad } from '../utils/getTrad';

import { recursiveRenameKeys } from './utils/rename-keys';

const FIELD_MAPPING = {
  name: 'label',
  id: 'value',
};

export const useFolderStructure = ({ enabled = true } = {}) => {
  const { formatMessage } = useIntl();
  const { get } = useFetchClient();

  const fetchFolderStructure = async () => {
    const {
      data: { data },
    } = await get('/upload/folder-structure');

    const children = data.map((f) => recursiveRenameKeys(f, (key) => FIELD_MAPPING?.[key] ?? key));

    return [
      {
        value: null,
        label: formatMessage({
          id: getTrad('form.input.label.folder-location-default-label'),
          defaultMessage: 'Media Library',
        }),
        children,
      },
    ];
  };

  const { data, error, isLoading } = useQuery(
    [pluginId, 'folder', 'structure'],
    fetchFolderStructure,
    {
      enabled,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  return { data, error, isLoading };
};
