import useLocalStorage from './useLocalStorage';

const PROJECT_FILTER_KEY = 'conversationProjectFilter';
const DEFAULT_PROJECT_FILTER = 'all';

export default function useConversationProjectFilter() {
  return useLocalStorage<string>(PROJECT_FILTER_KEY, DEFAULT_PROJECT_FILTER);
}
