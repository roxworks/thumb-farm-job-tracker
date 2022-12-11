import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "../../../server/db/client";


const updateJob = async (req: NextApiRequest, res: NextApiResponse) => {
    const jobDetails = req.body;
    const { baseId, generationId, images } = jobDetails;
    if (!baseId || !generationId || !images) {
        return res.status(400).json({ error: "Missing baseId or generationId or images" });
    }

    const job = await prisma.job.findUnique({
        where: {
            id: baseId
        }
    });

    if (!job) {
        return res.status(400).json({ error: "Job not found" });
    }

    const existingImages = job.images || [];
    const newImages = [...existingImages, ...images];
    const completedGenerations = job.completedGenerations || [];
    const newCompletedGenerations = [...completedGenerations, generationId];

    const status = newCompletedGenerations.length === job.generationIds.length ? 'done' : 'processing';

    const updatedJob = await prisma.job.update({
        where: {
            id: baseId
        },
        data: {
            images: newImages,
            completedGenerations: newCompletedGenerations,
            status
        }
    });

    res.status(200).json({
        ...job,
        completedGenerations: newCompletedGenerations,
        images: newImages,
        urls: newImages,
        status
    });
};

export default updateJob;
