import axios from 'axios';
import { CanvasService } from './canvas.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CanvasService pagination', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('follows Canvas Link rel=next headers for courses', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        headers: {
          link: '<https://canvas.example/api/v1/courses?page=2>; rel="next"',
        },
      })
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
        headers: {},
      });

    const config = {
      get: jest.fn((key: string) => key === 'CANVAS_BASE_URL' ? 'https://canvas.example/' : undefined),
    };
    const service = new CanvasService(config as any, {} as any);

    await expect(service.getCourses('canvas-token')).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    expect(mockedAxios.get.mock.calls[1][0]).toBe('https://canvas.example/api/v1/courses?page=2');
    expect(mockedAxios.get.mock.calls[1][1]?.params).toBeUndefined();
  });
});
